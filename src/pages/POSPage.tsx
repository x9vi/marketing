import { useEffect, useMemo, useState, useRef } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import type { Customer, Hold, PaymentMethod, Product, Sale, DiscountType, CashDrawer, ZReport, PromotionMatch } from '../api/types.js';
import { formatCurrency, formatDate } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.js';
import { Link } from 'react-router-dom';
import { InlineCashPanel } from '../components/InlineCashPanel.js';
import { InlineCardPanel } from '../components/InlineCardPanel.js';
import { InlineSplitPanel } from '../components/InlineSplitPanel.js';

type CartItem = {
  product: Product;
  quantity: number;
};

type HoldPayload = {
  items: Array<{ productId: string; quantity: number }>;
  customerId?: string;
  discountType?: DiscountType;
  discountValue?: number;
  payments?: Array<{ method: PaymentMethod; amount: number }>;
  pointsToRedeem?: number;
  couponCode?: string;
};

// Map category slugs to vibrant background gradients & emojis for a premium POS look
const categoryStyles: Record<string, { bg: string; text: string; emoji: string }> = {
  produce: { bg: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30', text: 'text-emerald-300', emoji: '🍎' },
  bakery: { bg: 'from-amber-500/20 to-orange-500/10 border-amber-500/30', text: 'text-amber-300', emoji: '🍞' },
  dairy: { bg: 'from-blue-500/20 to-sky-500/10 border-blue-500/30', text: 'text-blue-300', emoji: '🥛' },
  snacks: { bg: 'from-rose-500/20 to-pink-500/10 border-rose-500/30', text: 'text-rose-300', emoji: '🍿' },
  beverages: { bg: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30', text: 'text-indigo-300', emoji: '🥤' },
  household: { bg: 'from-slate-500/20 to-zinc-500/10 border-slate-500/30', text: 'text-slate-300', emoji: '🧼' },
  alcohol: { bg: 'from-violet-500/20 to-fuchsia-500/10 border-violet-500/30', text: 'text-violet-300', emoji: '🍷' }
};

const defaultCategoryStyle = { bg: 'from-slate-500/20 to-slate-600/10 border-white/10', text: 'text-slate-300', emoji: '📦' };

// Product translations database for UI and receipt printing
const productTranslations: Record<string, { en: string; ku: string }> = {
  'APL-001': { en: 'Apple', ku: 'سێو' },
  'BAN-001': { en: 'Banana', ku: 'مۆز' },
  'TOM-001': { en: 'Tomato', ku: 'تەماتە' },
  'MILK-01': { en: 'Whole Milk', ku: 'شیری تەواو' },
  'BRD-001': { en: 'White Bread', ku: 'سەموونی سپی' },
  'CHZ-001': { en: 'Cheddar Cheese', ku: 'پەنێری چەدار' },
  'CHP-001': { en: 'Potato Chips', ku: 'چپسی پەتاتە' },
  'COLA-01': { en: 'Cola 500ml', ku: 'کۆلا ٥٠٠مل' },
  'WTR-001': { en: 'Water 1L', ku: 'ئاو ١ لتر' },
  'DTGN-01': { en: 'Dish Detergent', ku: 'پاککەرەوەی قاپ' },
  'BEER-01': { en: 'Craft Beer 330ml', ku: 'بیرەی دەستی ٣٣٠مل' },
  'WINE-01': { en: 'Red Wine 750ml', ku: 'شەرابی سوور ٧٥٠مل' },
};

// Category translations
const categoryTranslations: Record<string, { en: string; ku: string }> = {
  'fresh-produce': { en: 'Fresh Produce', ku: 'میوە و سەوزە' },
  'bakery': { en: 'Bakery', ku: 'نان و سەموون' },
  'beverages': { en: 'Beverages', ku: 'خواردنەوەکان' },
  'household': { en: 'Household', ku: 'پێداویستی ناوماڵ' },
  'dairy': { en: 'Dairy', ku: 'بەرهەمە شیرییەکان' },
  'snacks': { en: 'Snacks', ku: 'خوێنشیرینی و چپس' },
  'meat-poultry': { en: 'Meat & Poultry', ku: 'گۆشت و پەلەوەر' },
  'alcohol': { en: 'Alcohol', ku: 'ئەلکحول' },
};

// Comprehensive English & Kurdish Sorani Translations dictionary
const translations = {
  en: {
    station: "Station #01",
    cashier: "Cashier",
    activeSession: "Session Active",
    offlineSession: "Session Offline",
    exitTerminal: "Exit Terminal",
    signOut: "Sign Out",
    totalDue: "Total Due",
    allItems: "All Items",
    searchPlaceholder: "Search by product name, SKU, barcode (F1)...",
    cartEmpty: "Your checkout basket is empty",
    checkout: "Checkout",
    exactCash: "Exact Cash (F2)",
    cardCheckout: "Card Pay (F3)",
    splitPay: "Split Pay",
    parkBasket: "Park Basket (F5)",
    recallHolds: "Recall Parked (Holds)",
    voidSale: "Void Sale (F8)",
    cashTillSession: "Cash Till Session",
    shiftZReport: "Shift Z-Report",
    refundLookup: "Refund Lookup",
    applyCoupon: "Apply Coupon",
    itemVoided: "Void item from basket",
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax (VAT)",
    total: "Total",
    changeDue: "Change Due",
    paid: "Paid",
    points: "Loyalty Points",
    pointsEarned: "Points Earned",
    pointsRedeemed: "Points Redeemed",
    customer: "Customer",
    selectCustomer: "Select Customer",
    searchCustomer: "Search customer...",
    phone: "Phone",
    email: "Email",
    addCustomer: "Add Customer",
    walkInCustomer: "Walk-in Customer",
    coupon: "Coupon",
    couponPlaceholder: "Enter coupon code...",
    apply: "Apply",
    close: "Close",
    cancel: "Cancel",
    save: "Save",
    ok: "OK",
    yes: "Yes",
    no: "No",
    enterPin: "Enter Manager PIN",
    verify: "Verify",
    invalidPin: "Invalid PIN entered",
    pinRequired: "PIN Override Required",
    refundReceipt: "Refund Receipt Finder",
    find: "Find",
    receiptNotFound: "Receipt number not found",
    refundApproved: "Refund approved successfully",
    reprintReceipt: "Reprint Receipt",
    receipt: "Receipt",
    date: "Date",
    cash: "Cash",
    card: "Card",
    price: "Price",
    qty: "Qty",
    sku: "SKU",
    barcode: "Barcode",
    stock: "Stock",
    add: "Add",
    remove: "Remove",
    weightVerification: "Weight Verification",
    scaleWeight: "Scale Weight (kg)",
    simulateScale: "Simulate Scale",
    confirm: "Confirm",
    ageVerification: "Age Verification Required",
    ageRestrictionText: "This product is age restricted. Verify customer age is above",
    openingFloat: "Opening Cash Float",
    closingFloat: "Closing Cash Float",
    openSession: "Open Session",
    closeSession: "Close Session",
    cashIn: "Cash In",
    cashOut: "Cash Out",
    amount: "Amount",
    reason: "Reason",
    logMovement: "Log Movement",
    zReport: "Z-Report Summary",
    totalSales: "Total Sales",
    netSales: "Net Sales",
    cashPayments: "Cash Payments",
    cardPayments: "Card Payments",
    floatStart: "Float Start",
    floatExpected: "Expected Float",
    zReportDescription: "Z-Report generated on session closure.",
    devMode: "Hardware Test Mode",
    devModeOn: "Hardware Simulation: ON",
    devModeOff: "Hardware Simulation: OFF",
    printSuccess: "Receipt sent to printer!",
    drawerSuccess: "Cash drawer opened!",
    transactionComplete: "Transaction Complete",
    downloadReceipt: "Download Receipt PDF",
    customWeight: "Enter custom weight",
    parkSuccess: "Transaction parked.",
    parkFailed: "Failed to park transaction",
    couponSuccess: "Coupon applied.",
    cashMovementSuccess: "Cash movement logged.",
    cashMovementFailed: "Failed logging cash movement",
    cashDrawerRequired: "Cash drawer must be opened before starting checkouts.",
    enterPaymentAmount: "Please enter a payment amount.",
    paymentLessThanDue: "Payment total is less than total due.",
    openSessionFailed: "Failed to open session",
    closeSessionFailed: "Failed closing session",
    zReportFailed: "Failed getting Z-report",
    selectItemsRefund: "Select items to refund.",
    refundFailed: "Refund failed",
    pointsLimitError: "Invalid loyalty points limit",
    openingFloatRequired: "Drawer closed. Establish opening cash float to activate POS terminal.",
    recallFailed: "Failed to recall transaction details",
    noParkedBaskets: "No parked baskets found",
    creditTerminalSetup: "Credit Card Terminal Setup",
    contactingTerminal: "Contacting credit card terminal...",
    insertCardAction: "Customer Action: TAP / INSERT CARD",
    terminalApproved: "Transaction Approved",
    expectedDrawerCash: "Expected Drawer Cash",
    countedDrawerCash: "Counted Drawer Cash",
    overShortAudit: "Over/Short Audit",
    printAuditor: "Print Auditor Copy",
    basketId: "Basket ID",
    recallBasketBtn: "Recall Basket",
    itemsCountLabel: "Items count",
    terminalResponseAuth: "Terminal response: Authorizing transaction...",
    reprintingCopy: "Reprinting duplicate receipt copy...",
    verifyPINFailed: "PIN verification failed",
    invalidCoupon: "Invalid coupon code",
    couponValidationFailed: "Coupon validation failed",
    checkoutFailed: "Checkout failed"
  },
  ku: {
    station: "وێستگەی ژمارە ٠١",
    cashier: "کاشێر",
    activeSession: "خولی کارایە",
    offlineSession: "خولی ناچالاکە",
    exitTerminal: "چوونەدەرەوە لە تێرمیناڵ",
    signOut: "چوونەدەرەوە",
    totalDue: "کۆی گشتی شایستە",
    allItems: "هەموو بابەتەکان",
    searchPlaceholder: "گەڕان بەپێی ناو، SKU، یان بارکۆد (F1)...",
    cartEmpty: "سەبەتەکەت بەتاڵە بۆ کڕین",
    checkout: "تەواوکردنی فرۆشتن",
    exactCash: "نەختی تەواو (F2)",
    cardCheckout: "پارە بە کارت (F3)",
    splitPay: "پارەدانی بەشەکراو",
    parkBasket: "ڕاگرتنی سەبەتە (F5)",
    recallHolds: "سەبەتە ڕاگیراوەکان",
    voidSale: "پوچەڵکردنەوەی فرۆشتن (F8)",
    cashTillSession: "خولی سندوقی پارە",
    shiftZReport: "ڕاپۆرتی کۆتایی شەفت Z",
    refundLookup: "گەڕان بەدوای گەڕانەوە",
    applyCoupon: "بەکارهێنانی کۆپۆن",
    itemVoided: "سڕینەوەی بابەت لە سەبەتەکە",
    subtotal: "کۆی لاوەکی",
    discount: "داشکاندن",
    tax: "باج (VAT)",
    total: "کۆی گشتی",
    changeDue: "ماوەی پارە (باقی)",
    paid: "دراو",
    points: "خاڵەکانی دڵسۆزی",
    pointsEarned: "خاڵی بەدەستهاتوو",
    pointsRedeemed: "خاڵی بەکارهاتوو",
    customer: "کڕیار",
    selectCustomer: "هەڵبژاردنی کڕیار",
    searchCustomer: "گەڕان بەدوای کڕیار...",
    phone: "ژمارەی مۆبایل",
    email: "ئیمەیڵ",
    addCustomer: "زیادکردنی کڕیار",
    walkInCustomer: "کڕیاری کاتی",
    coupon: "کۆپۆن",
    couponPlaceholder: "کۆدی کۆپۆن بنووسە...",
    apply: "جێبەجێکردن",
    close: "داخستن",
    cancel: "پاشگەزبوونەوە",
    save: "پاشەکەوتکردن",
    ok: "باشە",
    yes: "بەڵێ",
    no: "نەخێر",
    enterPin: "کۆدی PINی بەڕێوەبەر بنووسە",
    verify: "پشتڕاستکردنەوە",
    invalidPin: "کۆدی PIN نادروستە",
    pinRequired: "پێویستی بە پەسەندکردنی بەڕێوەبەر هەیە",
    refundReceipt: "دۆزەرەوەی پسوولەی گەڕانەوە",
    find: "بدۆزەرەوە",
    receiptNotFound: "پسوولەکە نەدۆزرایەوە",
    refundApproved: "گەڕانەوەکە بە سەرکەوتوویی پەسەندکرا",
    reprintReceipt: "چاپکردنەوەی پسوولە",
    receipt: "پسوولە",
    date: "ڕێککەوت",
    cash: "نەختینە",
    card: "کارت",
    price: "نرخ",
    qty: "ژمارە",
    sku: "SKU",
    barcode: "بارکۆد",
    stock: "کۆگا",
    add: "زيادكردن",
    remove: "سڕینەوە",
    weightVerification: "پشتڕاستکردنەوەی کێش",
    scaleWeight: "کێشی تەرازوو (کیلۆگرام)",
    simulateScale: "هاوشێوەکردنی تەرازوو",
    confirm: "پەسەندکردن",
    ageVerification: "پێویستی بە پشتڕاستکردنەوەی تەمەن هەیە",
    ageRestrictionText: "ئەم بەرهەمە سنووردارکردنی تەمەنی هەیە. دڵنیابەوە تەمەنی کڕیار زیاترە لە",
    openingFloat: "نەختی دەستپێک",
    closingFloat: "نەختی کۆتایی سندوق",
    openSession: "کردنەوەی خول",
    closeSession: "داخستنی خول",
    cashIn: "تێکردنی پارە (سندوق)",
    cashOut: "دەرهێنانی پارە (سندوق)",
    amount: "بڕی پارە",
    reason: "هۆکار",
    logMovement: "تۆمارکردنی جووڵە",
    zReport: "ڕاپۆرتی پوختەی Z",
    totalSales: "کۆی گشتی فرۆشتن",
    netSales: "فرۆشتنی پوخت",
    cashPayments: "پارەدانی نەختی",
    cardPayments: "پارەدانی کارتی",
    floatStart: "دەستپێکی نەختینە",
    floatExpected: "نەختینەی چاوەڕوانکراو",
    zReportDescription: "ڕاپۆرتی Z لە کاتی داخستنی خول دروستکرا.",
    devMode: "مۆدی تاقیکردنەوەی ڕەقەکاڵا",
    devModeOn: "هاوشێوەکردنی ڕەقەکاڵا: چالاکە",
    devModeOff: "هاوشێوەکردنی ڕەقەکاڵا: ناچالاکە",
    printSuccess: "پسوولەکە بە سەرکەوتوویی چاپکرا!",
    drawerSuccess: "سندوقی پارە کرایەوە!",
    transactionComplete: "فرۆشتنەکە بە سەرکەوتوویی تەواو بوو",
    downloadReceipt: "دابەزاندنی پسوولەی PDF",
    customWeight: "بڕی کێش بنووسە",
    parkSuccess: "سەبەتەی کڕین ڕاگیرا.",
    parkFailed: "سەبەتەی کڕین ڕانەگیرا",
    couponSuccess: "کۆپۆنەکە بە سەرکەوتوویی جێبەجێکرا.",
    cashMovementSuccess: "جووڵەی نەختی تۆمارکرا.",
    cashMovementFailed: "تۆمارکردنی جووڵەی نەختی سەرکەوتوو نەبوو",
    cashDrawerRequired: "پێویستە خولی سندوقی نەختی بکرێتەوە پێش فرۆشتن.",
    enterPaymentAmount: "تکایە بڕی پارەی دراو بنووسە.",
    paymentLessThanDue: "کۆی پارەی دراو کەمترە لە بڕی شایستە.",
    openSessionFailed: "کردنەوەی خول سەرکەوتوو نەبوو",
    closeSessionFailed: "داخستنی خول سەرکەوتوو نەبوو",
    zReportFailed: "کۆپی ڕاپۆرتی Z وەرنەگیرا",
    selectItemsRefund: "تکایە بابەتێک دیاریبکە بۆ گەڕانەوە.",
    refundFailed: "پرۆسەی گەڕانەوە شکست هێنا",
    pointsLimitError: "بڕی خاڵەکانی بەکارهێنراو نادروستە",
    openingFloatRequired: "سندوقی نەخت داخراوە. تکایە نەختی دەستپێک بنووسە بۆ چالاککردنی تێرمیناڵ.",
    recallFailed: "خوێندنەوەی فرۆشتنی ڕاگیراو سەرکەوتوو نەبوو",
    noParkedBaskets: "سەبەتەی ڕاگیراو بوونی نییە",
    creditTerminalSetup: "ڕێکخستنی تێرمیناڵی کارتی بانکی",
    contactingTerminal: "پەیوەندیکردن بە تێرمیناڵی بانکی...",
    insertCardAction: "کرداری کڕیار: کارتەکە لێبدە یان دابنێ",
    terminalApproved: "پارەدان پەسەندکرا",
    expectedDrawerCash: "نەختی چاوەڕوانکراوی سندوق",
    countedDrawerCash: "نەختی ژمێردراوی سندوق",
    overShortAudit: "وردبینی جیاوازی نەختینە",
    printAuditor: "چاپکردنی کۆپی وردبینی",
    basketId: "ناسنامەی سەبەتە",
    recallBasketBtn: "هێنانەوەی سەبەتە",
    itemsCountLabel: "ژمارەی بابەتەکان",
    terminalResponseAuth: "وەڵامی تێرمیناڵ: لە پرۆسەی پەسەندکردندایە...",
    reprintingCopy: "چاپکردنەوەی کۆپی پسوولەکە...",
    verifyPINFailed: "پشکنینی کۆدی PIN سەرکەوتوو نەبوو",
    invalidCoupon: "کۆدی کۆپۆن نادروستە",
    couponValidationFailed: "پشکنینی کۆپۆن شکست هێنا",
    checkoutFailed: "تەواوکردنی کڕین شکست هێنا"
  }
};

const printReceipt = (sale: any, lang: 'en' | 'ku', testMode: boolean, triggerToast?: (msg: string) => void) => {
  const t = translations[lang];

  if (testMode && triggerToast) {
    triggerToast(`🖨️ ${t.printSuccess} | 🪙 ${t.drawerSuccess}`);
  }

  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  const isRtl = lang === 'ku';

  const itemsHtml = (sale.items || []).map((item: any) => {
    const localizedName = productTranslations[item.sku]?.[lang] || item.productName;
    return `
      <tr>
        <td style="padding: 4px 0; font-size: 12px; font-family: ${isRtl ? 'monospace' : 'monospace'}; text-align: ${isRtl ? 'right' : 'left'};">
          ${localizedName}<br/>
          <span style="font-size: 11px; color: #444;">${item.quantity} x ${Number(item.unitPrice).toLocaleString('ar-IQ')} IQD</span>
        </td>
        <td style="text-align: ${isRtl ? 'left' : 'right'}; vertical-align: bottom; padding: 4px 0; font-size: 12px;">
          ${Number(item.lineTotal).toLocaleString('ar-IQ')} IQD
        </td>
      </tr>
    `;
  }).join('');

  const paymentsHtml = (sale.payments || []).map((p: any) => `
    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px; direction: ${isRtl ? 'rtl' : 'ltr'};">
      <span>${t.paid} (${p.method === 'CASH' ? t.cash : t.card}):</span>
      <span>${Number(p.amount).toLocaleString('ar-IQ')} IQD</span>
    </div>
  `).join('');

  const receiptHtml = `
    <html>
      <head>
        <title>Receipt ${sale.receiptNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap');
          @page {
            margin: 0;
          }
          body {
            font-family: ${isRtl ? "'Noto Sans Arabic', monospace" : "monospace"};
            width: 72mm;
            margin: 0;
            padding: 10px;
            font-size: 12px;
            line-height: 1.35;
            color: #000;
            background: #fff;
            direction: ${isRtl ? 'rtl' : 'ltr'};
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: ${isRtl ? 'right' : 'left'}; }
        </style>
      </head>
      <body>
        <div class="center">
          <span style="font-size: 16px;" class="bold">${isRtl ? 'فرێش مارت' : 'FRESHMART'}</span><br/>
          <span>123 Market Road</span><br/>
          <span>Tel: +1-555-000-200</span>
        </div>
        <div class="divider"></div>
        <div style="font-size: 11px;">
          <span>${t.receipt} #: ${sale.receiptNumber}</span><br/>
          <span>${t.date}: ${new Date(sale.createdAt).toLocaleString(isRtl ? 'ku-IQ' : 'en-US')}</span><br/>
          <span>${t.cashier}: ${sale.user?.name || 'Staff'}</span>
          ${sale.customer ? `<br/><span>${t.customer}: ${sale.customer.name}</span>` : ''}
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th class="bold" style="font-size: 12px;">${t.allItems}</th>
              <th class="bold" style="text-align: ${isRtl ? 'left' : 'right'}; font-size: 12px;">${t.total}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between;" class="bold">
          <span>${t.subtotal}:</span>
          <span>${Number(sale.subtotal).toLocaleString('ar-IQ')} IQD</span>
        </div>
        ${Number(sale.discountAmount) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>${t.discount}:</span>
          <span>-${Number(sale.discountAmount).toLocaleString('ar-IQ')} IQD</span>
        </div>
        ` : ''}
        ${Number(sale.couponDiscount) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>${t.coupon}:</span>
          <span>-${Number(sale.couponDiscount).toLocaleString('ar-IQ')} IQD</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between;" class="bold">
          <span>${t.total}:</span>
          <span>${Number(sale.total).toLocaleString('ar-IQ')} IQD</span>
        </div>
        <div class="divider"></div>
        ${paymentsHtml}
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px;">
          <span>${t.changeDue}:</span>
          <span>${Number(sale.changeAmount).toLocaleString('ar-IQ')} IQD</span>
        </div>
        ${sale.pointsEarned ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
          <span>${t.pointsEarned}:</span>
          <span>+${sale.pointsEarned}</span>
        </div>
        ` : ''}
        <div class="divider"></div>
        <div class="center" style="margin-top: 15px; font-size: 11px;">
          ${isRtl ? 'سوپاس بۆ کڕینەکەتان لە فرێش مارت!' : 'Thank you for shopping at FreshMart!'}<br/>
          ${isRtl ? 'هەمیشە بەخێربێن.' : 'Please come again.'}
        </div>
        <div style="height: 35px;"></div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(receiptHtml);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
};

export function POSPage() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isCashier = user?.role === 'CASHIER';

  // Localization and hardware test states
  const [lang, setLang] = useState<'en' | 'ku'>('en');
  const [testMode, setTestMode] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const t = translations[lang];
  const isRtl = lang === 'ku';

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message: msg, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Search and inventory states
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENT');
  const [discountValue, setDiscountValue] = useState('0');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState('0');
  const [activePromos, setActivePromos] = useState<PromotionMatch[]>([]);

  // Payment states
  const [payments, setPayments] = useState<{ method: PaymentMethod; amount: number }[]>([]);
  const [cashAmount, setCashAmount] = useState('0');
  const [cardAmount, setCardAmount] = useState('0');
  const [paymentStep, setPaymentStep] = useState<'idle' | 'terminal_connecting' | 'terminal_tap' | 'terminal_approving' | 'terminal_approved'>('idle');

  // Drawer status
  const [drawer, setDrawer] = useState<CashDrawer | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(true);

  // Hold transactions
  const [holdId, setHoldId] = useState('');
  const [holdsCount, setHoldsCount] = useState(0);
  const [holds, setHolds] = useState<Hold[]>([]);

  // Success states
  const [sale, setSale] = useState<Sale | null>(null);

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    'none' | 'pin' | 'age' | 'coupon' | 'refund' | 'drawer' | 'zreport' | 'holds' | 'weight'
  >('none');

  // Checkout panel view: which inline payment panel is visible
  const [checkoutView, setCheckoutView] = useState<'menu' | 'cash' | 'card' | 'split'>('menu');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Scale simulation state
  const [scaleProduct, setScaleProduct] = useState<Product | null>(null);
  const [scaleWeight, setScaleWeight] = useState('1.00');

  // Age verification state
  const [ageProduct, setAgeProduct] = useState<Product | null>(null);

  // PIN validation callback state
  const [pinCallback, setPinCallback] = useState<{ onSuccess: () => void; label: string } | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');

  // Refund states
  const [refundReceipt, setRefundReceipt] = useState('');
  const [refundSale, setRefundSale] = useState<any | null>(null);
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
  const [refundReason, setRefundReason] = useState('');
  const [refundSuccessPdf, setRefundSuccessPdf] = useState<string | null>(null);

  // Drawer inputs
  const [drawerFloatInput, setDrawerFloatInput] = useState('100000');
  const [cashMovementAmount, setCashMovementAmount] = useState('');
  const [cashMovementReason, setCashMovementReason] = useState('');
  const [zReportData, setZReportData] = useState<ZReport | null>(null);

  // Load drawer, categories, products
  const loadDrawer = async () => {
    try {
      const result = await apiFetch<{ drawer: CashDrawer | null }>('/cashier/drawer');
      setDrawer(result.drawer);
    } catch {
      setDrawer(null);
    } finally {
      setDrawerLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await apiFetch<{ categories: any[] }>('/categories');
      setCategories(result.categories);
    } catch {}
  };

  const loadProducts = async () => {
    try {
      const result = await apiFetch<{ products: Product[] }>('/products');
      setProducts(result.products);
    } catch {}
  };

  const loadHoldsCount = async () => {
    try {
      const result = await apiFetch<{ holds: Hold[] }>('/sales/holds');
      setHolds(result.holds);
      setHoldsCount(result.holds.length);
    } catch {}
  };

  useEffect(() => {
    void loadDrawer();
    void loadCategories();
    void loadProducts();
    void loadHoldsCount();
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' &&
        document.activeElement !== searchInputRef.current &&
        e.key !== 'Escape' &&
        e.key !== 'Enter'
      ) {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0 && drawer) {
          setCashAmount(String(total));
          setCardAmount('0');
          setPayments([{ method: 'CASH', amount: total }]);
          void triggerCheckout(true);
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (cart.length > 0 && drawer) {
          setCashAmount('0');
          setCardAmount(String(total));
          setPayments([{ method: 'CARD', amount: total }]);
          void triggerCheckout(false);
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (cart.length > 0) {
          void saveHold();
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          handleVoidTransaction();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeModals();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const closeModals = () => {
    setActiveModal('none');
    setPinValue('');
    setPinError('');
    setPinCallback(null);
    setRefundSale(null);
    setRefundReceipt('');
    setRefundSuccessPdf(null);
    setPaymentStep('idle');
  };

  // Filtered Products List with bilingual search support
  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }
    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      result = result.filter((p) => {
        const trans = productTranslations[p.sku];
        const kuName = trans?.ku.toLowerCase() || '';
        const enName = trans?.en.toLowerCase() || p.name.toLowerCase();
        return (
          enName.includes(q) ||
          kuName.includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
        );
      });
    }
    return result;
  }, [products, selectedCategory, query, lang]);

  // Customer match search debouncer
  useEffect(() => {
    const run = async () => {
      if (customerQuery.trim().length < 2) {
        setCustomerResults([]);
        return;
      }
      const result = await apiFetch<{ customers: Customer[] }>(`/customers?query=${encodeURIComponent(customerQuery)}`);
      setCustomerResults(result.customers);
    };
    const timer = setTimeout(() => void run().catch(() => undefined), 250);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  // Promo matcher hook
  const updateMatchedPromotions = async (currentCart: CartItem[]) => {
    if (!currentCart.length) {
      setActivePromos([]);
      return;
    }
    try {
      const payload = {
        items: currentCart.map((i) => ({
          productId: i.product.id,
          categoryId: i.product.categoryId,
          quantity: i.quantity,
          price: Number(i.product.price)
        }))
      };
      const result = await apiFetch<{ matches: PromotionMatch[] }>('/promotions/match', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setActivePromos(result.matches);
    } catch {
      setActivePromos([]);
    }
  };

  useEffect(() => {
    void updateMatchedPromotions(cart);
  }, [cart]);

  // Totals calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  }, [cart]);

  const manualDiscount = useMemo(() => {
    return discountType === 'PERCENT'
      ? subtotal * (Number(discountValue) / 100)
      : Math.min(subtotal, Number(discountValue));
  }, [subtotal, discountType, discountValue]);

  const promoDiscount = useMemo(() => {
    return activePromos.reduce((sum, promo) => sum + Number(promo.discount), 0);
  }, [activePromos]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return appliedCoupon.discount;
  }, [appliedCoupon]);

  const customerRedeemable = useMemo(() => {
    if (!selectedCustomer) return 0;
    const remaining = Math.max(0, subtotal - manualDiscount - couponDiscount - promoDiscount);
    return Math.min(Number(pointsToRedeem || 0), selectedCustomer.loyaltyPoints, Math.floor(remaining));
  }, [selectedCustomer, subtotal, manualDiscount, couponDiscount, promoDiscount, pointsToRedeem]);

  const total = useMemo(() => {
    return Math.max(0, Number((subtotal - manualDiscount - couponDiscount - promoDiscount - customerRedeemable).toFixed(2)));
  }, [subtotal, manualDiscount, couponDiscount, promoDiscount, customerRedeemable]);

  const plannedCash = Number(cashAmount || 0);
  const plannedCard = Number(cardAmount || 0);
  const paid = useMemo(() => {
    if (payments.length > 0) {
      return payments.reduce((sum, p) => sum + p.amount, 0);
    }
    return plannedCash + plannedCard;
  }, [payments, plannedCash, plannedCard]);

  const changeDue = useMemo(() => {
    return Math.max(0, paid - total);
  }, [paid, total]);

  const taxBreakdown = useMemo(() => {
    let totalTax = 0;
    cart.forEach((item) => {
      const rate = item.product.taxCategory ? Number(item.product.taxCategory.rate) : 0;
      const lineTotal = Number(item.product.price) * item.quantity;
      const lineTax = Number((lineTotal * rate / (1 + rate)).toFixed(2));
      totalTax += lineTax;
    });
    return totalTax;
  }, [cart]);

  // Barcode scanner integration helper
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const matchedProduct = products.find(
      (p) => p.sku === query.trim() || p.barcode === query.trim()
    );

    if (matchedProduct) {
      setQuery('');
      addProduct(matchedProduct);
    }
  };

  // Add Item to cart
  const addProduct = (product: Product) => {
    if (!drawer) {
      showNotification(t.cashDrawerRequired, 'error');
      return;
    }

    addToCart(product, 1);
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...current, { product, quantity }];
    });
    setSale(null);
  };

  // Manual loyalty points redemption limits
  const handleRedeemPointsChange = (val: string) => {
    if (!selectedCustomer) return;
    const numeric = Math.min(Number(val || 0), selectedCustomer.loyaltyPoints);
    setPointsToRedeem(String(numeric));
  };

  // Cash Denomination triggers
  const handleDenominationClick = (val: number) => {
    setCashAmount((prev) => {
      const current = Number(prev || 0);
      return String(current + val);
    });
  };

  const handleExactCashClick = () => {
    setCashAmount(String(total));
  };

  // PIN verification flow
  const triggerPINOverride = (label: string, onSuccess: () => void) => {
    if (!isCashier) {
      onSuccess();
      return;
    }
    setPinCallback({ onSuccess, label });
    setPinValue('');
    setPinError('');
    setActiveModal('pin');
  };

  const handleVerifyPIN = async () => {
    if (!pinValue) return;
    try {
      const result = await apiFetch<{ valid: boolean; message?: string }>('/auth/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: pinValue })
      });
      if (result.valid) {
        closeModals();
        if (pinCallback) pinCallback.onSuccess();
      } else {
        setPinError(result.message ?? t.invalidPin);
      }
    } catch (err: any) {
      setPinError(err.message ?? t.verifyPINFailed);
    }
  };

  const handleRemoveCartItem = (productId: string) => {
    triggerPINOverride(t.itemVoided, () => {
      setCart((current) => current.filter((item) => item.product.id !== productId));
    });
  };

  const handleVoidTransaction = () => {
    triggerPINOverride(t.voidSale, () => {
      clearCart();
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setHoldId('');
    setSale(null);
    setDiscountValue('0');
    setPointsToRedeem('0');
    setAppliedCoupon(null);
    setCouponCode('');
    setCashAmount('0');
    setCardAmount('0');
    setPayments([]);
    setCheckoutView('menu');
  };

  // Modals callbacks
  const confirmAgeVerification = () => {
    if (ageProduct) {
      const product = ageProduct;
      setAgeProduct(null);
      closeModals();
      if (product.unit === 'KG' || product.unit === 'LITER') {
        setScaleProduct(product);
        setScaleWeight('1.00');
        setActiveModal('weight');
      } else {
        addToCart(product, 1);
      }
    }
  };

  const handleWeightConfirm = () => {
    if (scaleProduct) {
      const weight = Number(scaleWeight || 0);
      if (weight <= 0) return;
      addToCart(scaleProduct, weight);
      setScaleProduct(null);
      closeModals();
    }
  };

  const handleSimulateScale = () => {
    setScaleWeight((Math.random() * 2 + 0.15).toFixed(2));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const result = await apiFetch<{ valid: boolean; coupon?: any; discount?: number; message?: string }>(
        '/coupons/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code: couponCode, subtotal })
        }
      );
      if (result.valid && result.coupon) {
        setAppliedCoupon({ code: couponCode.toUpperCase(), discount: result.discount ?? 0 });
        closeModals();
        showNotification(t.couponSuccess, 'success');
      } else {
        showNotification(result.message ?? t.invalidCoupon, 'error');
      }
    } catch (err: any) {
      showNotification(err.message ?? t.couponValidationFailed, 'error');
    }
  };

  // Inline cash payment confirm handler
  const handleInlineCashConfirm = (receivedAmount: number, changeAmount: number) => {
    if (!cart.length) return;
    const checkoutPayments: { method: PaymentMethod; amount: number }[] = [
      { method: 'CASH', amount: total },
    ];
    setPayments(checkoutPayments);
    setCashAmount(String(receivedAmount));
    setCheckoutView('menu');
    void runCheckout(checkoutPayments);
    if (changeAmount > 0) {
      showNotification(`💵 ${t.changeDue}: ${formatCurrency(changeAmount)}`, 'info');
    }
  };

  // Inline card payment confirm handler
  const handleInlineCardConfirm = () => {
    if (!cart.length) return;
    const checkoutPayments: { method: PaymentMethod; amount: number }[] = [
      { method: 'CARD', amount: total },
    ];
    setPayments(checkoutPayments);
    setCheckoutView('menu');
    void runCheckout(checkoutPayments);
  };

  // Inline split payment confirm handler
  const handleInlineSplitConfirm = (cashAmt: number, cardAmt: number) => {
    if (!cart.length) return;
    const list: { method: PaymentMethod; amount: number }[] = [];
    if (cashAmt > 0) list.push({ method: 'CASH', amount: cashAmt });
    if (cardAmt > 0) list.push({ method: 'CARD', amount: cardAmt });
    setPayments(list);
    setCheckoutView('menu');
    void runCheckout(list);
  };

  const triggerCheckout = (isCash: boolean) => {
    if (!cart.length) return;
    const checkoutAmount = total;
    if (isCash) {
      setPayments([{ method: 'CASH', amount: checkoutAmount }]);
      void runCheckout([{ method: 'CASH', amount: checkoutAmount }]);
    } else {
      // Card-only quick checkout — via inline card panel
      setCheckoutView('card');
    }
  };

  const runCheckout = async (checkoutPayments: { method: PaymentMethod; amount: number; reference?: string }[]) => {
    try {
      const result = await apiFetch<{ sale: Sale }>('/sales/checkout', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          discountType,
          discountValue: Number(discountValue),
          pointsToRedeem: Number(pointsToRedeem),
          payments: checkoutPayments,
          holdId: holdId || undefined,
          couponCode: appliedCoupon?.code,
          ageVerified: ageProduct ? true : undefined
        })
      });

      setSale(result.sale);
      printReceipt(result.sale, lang, testMode, showNotification);
      setCart([]);
      setSelectedCustomer(null);
      setHoldId('');
      setDiscountValue('0');
      setPointsToRedeem('0');
      setAppliedCoupon(null);
      setCouponCode('');
      setCashAmount('0');
      setCardAmount('0');
      setPayments([]);
      closeModals();
      void loadHoldsCount();
      void loadProducts();
      showNotification(t.transactionComplete, 'success');
    } catch (err: any) {
      showNotification(err.message ?? t.checkoutFailed, 'error');
      closeModals();
    }
  };

  // Legacy split handler kept for any keyboard shortcut paths
  const handleSplitCheckoutSubmit = () => {
    setCheckoutView('split');
  };

  // Hold Baskets
  const saveHold = async () => {
    try {
      await apiFetch('/sales/hold', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          customerId: selectedCustomer?.id,
          discountType,
          discountValue: Number(discountValue),
          pointsToRedeem: Number(pointsToRedeem),
          couponCode: appliedCoupon?.code
        })
      });
      clearCart();
      void loadHoldsCount();
      showNotification(t.parkSuccess, 'success');
    } catch (err: any) {
      showNotification(err.message ?? t.parkFailed, 'error');
    }
  };

  const resumeHold = async (hold: Hold) => {
    const payload = (typeof hold.payload === 'string' ? JSON.parse(hold.payload) : hold.payload) as HoldPayload;
    const items = payload?.items || [];
    setHoldId(hold.id);
    setDiscountType(payload.discountType ?? 'PERCENT');
    setDiscountValue(String(payload.discountValue ?? 0));
    setPointsToRedeem(String(payload.pointsToRedeem ?? 0));
    setCouponCode(payload.couponCode ?? '');
    setAppliedCoupon(payload.couponCode ? { code: payload.couponCode, discount: 0 } : null);

    try {
      if (payload.customerId) {
        const result = await apiFetch<{ customers: Customer[] }>(`/customers?query=${payload.customerId}`);
        setSelectedCustomer(result.customers[0] ?? null);
      }
      if (items.length > 0) {
        const productResult = await apiFetch<{ products: Product[] }>(
          `/products?ids=${items.map((item) => item.productId).join(',')}`
        );
        setCart(
          items
            .map((item) => {
              const product = productResult.products.find((entry: Product) => entry.id === item.productId);
              return product ? { product, quantity: item.quantity } : null;
            })
            .filter((item): item is CartItem => Boolean(item))
        );
      } else {
        setCart([]);
      }
      closeModals();
    } catch {
      showNotification(t.recallFailed, 'error');
    }
  };

  // Drawer & Shift closures
  const handleOpenDrawer = async () => {
    const amount = Number(drawerFloatInput || 0);
    try {
      const result = await apiFetch<{ drawer: CashDrawer }>('/cashier/drawer/open', {
        method: 'POST',
        body: JSON.stringify({ openingFloat: amount })
      });
      setDrawer(result.drawer);
      closeModals();
    } catch (err: any) {
      showNotification(err.message ?? t.openSessionFailed, 'error');
    }
  };

  const handleCashMovement = async (type: 'CASH_IN' | 'CASH_OUT') => {
    const amount = Number(cashMovementAmount || 0);
    if (amount <= 0) return;
    const url = type === 'CASH_IN' ? '/cashier/drawer/cash-in' : '/cashier/drawer/cash-out';
    try {
      await apiFetch(url, { method: 'POST', body: JSON.stringify({ amount, reason: cashMovementReason }) });
      setCashMovementAmount('');
      setCashMovementReason('');
      void loadDrawer();
      showNotification(t.cashMovementSuccess, 'success');
    } catch (err: any) {
      showNotification(err.message ?? t.cashMovementFailed, 'error');
    }
  };

  const handleCloseDrawer = async () => {
    const amount = Number(drawerFloatInput || 0);
    try {
      const result = await apiFetch<{ drawer: CashDrawer }>('/cashier/drawer/close', {
        method: 'POST',
        body: JSON.stringify({ closingFloat: amount })
      });
      setDrawer(null);
      closeModals();

      const zReport = await apiFetch<ZReport>('/cashier/z-report');
      setZReportData(zReport);
      setActiveModal('zreport');
    } catch (err: any) {
      showNotification(err.message ?? t.closeSessionFailed, 'error');
    }
  };

  const handleShowZReport = async () => {
    try {
      const result = await apiFetch<ZReport>('/cashier/z-report');
      setZReportData(result);
      setActiveModal('zreport');
    } catch (err: any) {
      showNotification(err.message ?? t.zReportFailed, 'error');
    }
  };

  // Refund lookup
  const handleLookupReceipt = async () => {
    if (!refundReceipt.trim()) return;
    try {
      const result = await apiFetch<{ sale: any }>(`/sales/lookup?receipt=${refundReceipt.trim()}`);
      setRefundSale(result.sale);
      const initialQtys: Record<string, number> = {};
      result.sale.items.forEach((item: any) => {
        if (!item.voided) {
          initialQtys[item.productId] = 0;
        }
      });
      setRefundQuantities(initialQtys);
    } catch (err: any) {
      showNotification(err.message ?? t.receiptNotFound, 'error');
    }
  };

  const handleItemRefundQtyChange = (productId: string, val: number, max: number) => {
    setRefundQuantities((current) => ({
      ...current,
      [productId]: Math.max(0, Math.min(val, max))
    }));
  };

  const handleProcessRefundSubmit = () => {
    const itemsToRefund = Object.entries(refundQuantities)
      .map(([productId, quantity]) => ({ productId, quantity }))
      .filter((i) => i.quantity > 0);

    if (itemsToRefund.length === 0) {
      showNotification(t.selectItemsRefund, 'error');
      return;
    }

    triggerPINOverride('Process receipt refund', async () => {
      try {
        await apiFetch(`/sales/${refundSale.id}/refund`, {
          method: 'POST',
          body: JSON.stringify({ items: itemsToRefund, reason: refundReason })
        });
        setRefundSuccessPdf(apiUrl(`/sales/${refundSale.id}/receipt.pdf`));
        setRefundSale(null);
        setRefundReason('');
        setRefundReceipt('');
        showNotification(t.refundApproved, 'success');
        void loadProducts();
      } catch (err: any) {
        showNotification(err.message ?? t.refundFailed, 'error');
      }
    });
  };

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans p-3 select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* 1. PROFESSIONAL CASHIER TILL HEADER */}
      <header className="flex h-16 items-center justify-between flex-row rounded-xl bg-slate-900 border border-white/10 px-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex-shrink-0">
        <div className="flex flex-row items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-gold-600 to-gold-400 text-slate-950 text-xl font-black shadow-[0_0_12px_rgba(232,184,79,0.3)]">
              🛒
            </span>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                FreshMart Terminal <span className="text-[10px] bg-gold-500/10 text-gold-400 border border-gold-500/20 px-1.5 py-0.5 rounded font-mono">SYS-04</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 font-mono">
                {t.station} · {t.cashier}: {user?.name}
              </p>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)] ${drawer ? 'bg-mint-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
              {drawer ? t.activeSession : t.offlineSession}
            </span>
          </div>
        </div>

        <div className="flex flex-row items-center gap-3">
          {/* Language Switcher */}
          <div className="flex bg-slate-950 rounded-lg p-0.5 border border-white/5">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 text-[10px] font-black rounded-md transition-all ${
                lang === 'en' ? 'bg-gold-500 text-slate-950 shadow-md font-bold' : 'text-slate-500 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('ku')}
              className={`px-3 py-1.5 text-[10px] font-black rounded-md transition-all ${
                lang === 'ku' ? 'bg-gold-500 text-slate-950 shadow-md font-bold' : 'text-slate-500 hover:text-white'
              }`}
            >
              کوردی
            </button>
          </div>

          {/* Hardware Test Mode Trigger */}
          <button
            onClick={() => {
              setTestMode(!testMode);
              showNotification(testMode ? t.devModeOff : t.devModeOn, 'info');
            }}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-black border transition-all ${
              testMode
                ? 'bg-mint-500/10 border-mint-500/30 text-mint-400 shadow-[0_0_10px_rgba(74,222,128,0.15)]'
                : 'bg-slate-950 border-white/5 text-slate-500'
            }`}
          >
            🧪 {testMode ? t.devModeOn : t.devModeOff}
          </button>

          {/* Exit POS back to Admin dashboard */}
          {isAdmin && (
            <Link
              to="/app"
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-[10px] font-black text-slate-300 hover:bg-white/5 hover:text-white transition-all"
            >
              🚪 {t.exitTerminal}
            </Link>
          )}

          {/* Quick logout option */}
          <button
            onClick={() => void logout()}
            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-black text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            👋 {t.signOut}
          </button>


        </div>
      </header>

      {/* 2. MAIN POS LAYOUT: Cart | Product Grid | Category Sidebar */}
      <section className={`flex flex-1 overflow-hidden my-2 min-h-0 gap-0 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* ── LEFT: CHECKOUT / CART PANEL ── */}
        <div className="flex flex-col overflow-hidden rounded-l-xl border border-white/10 bg-slate-900/70 shadow-[0_4px_25px_rgba(0,0,0,0.5)]" style={{width:'320px', flexShrink:0}}>
          {/* Cart panel header */}
          <div style={{
            background:'linear-gradient(90deg,#0f172a,#0e1829)',
            borderBottom:'1px solid rgba(255,255,255,0.07)',
            padding:'5px 10px',
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            flexShrink:0,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:'12px'}}>🧾</span>
              <span style={{fontSize:'10px',fontWeight:900,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px'}}>
                {isRtl ? 'سەبەتە' : 'CURRENT SALE'}
              </span>
            </div>
            <span style={{
              fontSize:'8px', fontWeight:700, color:'#475569', fontFamily:'monospace',
            }}>
              {cart.reduce((s,i)=>s+i.quantity,0)} {isRtl?'بابەت':'items'}
            </span>
          </div>

          {/* Active Loyalty Customer Badge */}
          {selectedCustomer && (
            <div className="border-b border-white/5 bg-slate-950/60 px-2 py-1.5">
              <div className="flex items-center justify-between rounded bg-gold-500/10 border border-gold-500/20 px-2 py-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">👤</span>
                  <div>
                    <p className="font-extrabold text-white text-[10px] leading-none">{selectedCustomer.name}</p>
                    <p className="text-[8px] text-slate-400 font-mono mt-0.5">
                      {t.points}: {selectedCustomer.loyaltyPoints}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setPointsToRedeem('0');
                  }}
                  className="text-red-400 hover:text-red-300 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Cart Items List — compact receipt-tape style */}
          <div className="flex-1 overflow-y-auto scrollbar-thin" style={{padding:'4px 6px'}}>
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-500 gap-2">
                <span className="text-3xl">📄</span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isRtl ? 'سەبەتە بەتاڵە' : 'TICKET EMPTY - SCAN ITEMS'}
                </p>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                {cart.map((item) => {
                  const lineTotal = Number(item.product.price) * item.quantity;
                  const itemLabel = item.product.unit === 'KG' ? 'kg' : item.product.unit === 'LITER' ? 'L' : 'pc';
                  const localizedName = productTranslations[item.product.sku]?.[lang] || item.product.name;

                  return (
                    <div
                      key={item.product.id}
                      style={{
                        background:'rgba(15,23,42,0.7)',
                        borderBottom:'1px solid rgba(255,255,255,0.05)',
                        padding:'4px 6px',
                      }}
                    >
                      {/* Name row */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4}}>
                        <span style={{
                          fontSize:'10px',fontWeight:800,color:'#e2e8f0',
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                          flex:1, minWidth:0,
                          direction: isRtl ? 'rtl' : 'ltr',
                        }}>{localizedName}</span>
                        <button
                          onClick={() => handleRemoveCartItem(item.product.id)}
                          style={{color:'#475569',fontSize:'9px',fontWeight:900,flexShrink:0,padding:'0 2px'}}
                          title={t.remove}
                        >✕</button>
                      </div>
                      {/* Qty + price row */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'2px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'2px'}}>
                          <button
                            onClick={() => {
                              if (item.quantity <= 1) {
                                handleRemoveCartItem(item.product.id);
                              } else {
                                setCart((curr) =>
                                  curr.map((c) =>
                                    c.product.id === item.product.id ? { ...c, quantity: c.quantity - 1 } : c
                                  )
                                );
                              }
                            }}
                            style={{
                              width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',
                              background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',
                              borderRadius:2,color:'#94a3b8',fontSize:'11px',fontWeight:900,cursor:'pointer',
                            }}
                          >−</button>
                          <span style={{
                            width:32,textAlign:'center',fontSize:'11px',fontFamily:'monospace',
                            fontWeight:900,color:'#fff',
                          }}>
                            {item.product.unit === 'KG' || item.product.unit === 'LITER'
                              ? item.quantity.toFixed(2)
                              : item.quantity}{itemLabel}
                          </span>
                          <button
                            onClick={() => {
                              setCart((curr) =>
                                curr.map((c) =>
                                  c.product.id === item.product.id ? { ...c, quantity: c.quantity + 1 } : c
                                )
                              );
                            }}
                            style={{
                              width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',
                              background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',
                              borderRadius:2,color:'#94a3b8',fontSize:'11px',fontWeight:900,cursor:'pointer',
                            }}
                          >+</button>
                        </div>
                        <span style={{
                          fontSize:'11px',fontFamily:'monospace',fontWeight:900,
                          color:'#fbbf24',letterSpacing:'-0.3px',
                        }}>{formatCurrency(lineTotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Checkout Totals & Transaction Control Center ── */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: '#070a12',
            flexShrink: 0,
          }}>

            {/* ── TOTALS STRIP ── */}
            <div style={{padding:'6px 10px 4px', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              {/* Subtotal / Discount / Tax rows */}
              <div style={{display:'flex',flexDirection:'column',gap:'2px',marginBottom:'4px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'9px',color:'#64748b',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>{t.subtotal}</span>
                  <span style={{fontSize:'10px',color:'#cbd5e1',fontFamily:'monospace',fontWeight:700}}>{formatCurrency(subtotal)}</span>
                </div>
                {Number(pointsToRedeem) > 0 && selectedCustomer && (
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'9px',color:'#f87171',fontWeight:600}}>{t.pointsRedeemed} ({pointsToRedeem}pts)</span>
                    <span style={{fontSize:'10px',color:'#f87171',fontFamily:'monospace',fontWeight:700}}>−{formatCurrency(customerRedeemable)}</span>
                  </div>
                )}
                {(manualDiscount > 0 || couponDiscount > 0) && (
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'9px',color:'#f87171',fontWeight:600}}>{t.discount}</span>
                    <span style={{fontSize:'10px',color:'#f87171',fontFamily:'monospace',fontWeight:700}}>−{formatCurrency(manualDiscount + couponDiscount)}</span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'9px',color:'#34d399',fontWeight:600}}>Auto Promos</span>
                    <span style={{fontSize:'10px',color:'#34d399',fontFamily:'monospace',fontWeight:700}}>−{formatCurrency(promoDiscount)}</span>
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'9px',color:'#64748b',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>{t.tax}</span>
                  <span style={{fontSize:'10px',color:'#94a3b8',fontFamily:'monospace',fontWeight:700}}>{formatCurrency(taxBreakdown)}</span>
                </div>
              </div>

              {/* Grand Total — compact LED bar */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'linear-gradient(90deg,#052e16,#064e3b)',
                border:'1px solid rgba(52,211,153,0.2)',
                borderRadius:'5px',
                padding:'5px 10px',
              }}>
                <span style={{fontSize:'9px',color:'#6ee7b7',fontWeight:900,textTransform:'uppercase',letterSpacing:'1.5px'}}>{t.total}</span>
                <span style={{fontSize:'20px',color:'#34d399',fontFamily:'monospace',fontWeight:900,letterSpacing:'-1px',lineHeight:1}}>{formatCurrency(total)}</span>
              </div>

              {/* Loyalty points slider — only when customer has points */}
              {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
                <div style={{marginTop:'4px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'4px',padding:'4px 6px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'2px'}}>
                    <span style={{fontSize:'8px',color:'#475569',fontFamily:'monospace'}}>Redeem (Max {selectedCustomer.loyaltyPoints} pts)</span>
                    <span style={{fontSize:'8px',color:'#fbbf24',fontWeight:700,fontFamily:'monospace'}}>−{formatCurrency(customerRedeemable)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={selectedCustomer.loyaltyPoints}
                    value={pointsToRedeem}
                    onChange={(e) => handleRedeemPointsChange(e.target.value)}
                    style={{width:'100%',height:'3px',accentColor:'#d97706',cursor:'pointer',display:'block'}}
                  />
                </div>
              )}
            </div>

            {/* ── PAYMENT BUTTONS ── (shown when menu view) */}
            <div style={{
              overflow: 'hidden',
              maxHeight: checkoutView === 'menu' ? '400px' : '0px',
              opacity: checkoutView === 'menu' ? 1 : 0,
              transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
            }}>
              <div style={{padding:'6px 8px', display:'flex', flexDirection:'column', gap:'5px'}}>

                {/* PRIMARY ROW: Cash | Card | Split — 3 equal columns */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'4px'}}>
                  {/* CASH */}
                  <button
                    id="pos-cash-payment-btn"
                    onClick={() => setCheckoutView('cash')}
                    disabled={!cart.length || !drawer}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      gap:'1px', padding:'7px 4px',
                      background:'linear-gradient(160deg,#064e3b,#065f46)',
                      border:'1px solid rgba(52,211,153,0.3)',
                      borderRadius:'5px',
                      color:'#34d399',
                      cursor: (!cart.length || !drawer) ? 'not-allowed' : 'pointer',
                      opacity: (!cart.length || !drawer) ? 0.35 : 1,
                      transition:'opacity 0.1s, transform 0.08s',
                    }}
                    onMouseDown={e => { if (cart.length && drawer) (e.currentTarget as HTMLElement).style.transform='scale(0.96)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
                  >
                    <span style={{fontSize:'14px',lineHeight:1}}>💵</span>
                    <span style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3px'}}>
                      {lang === 'ku' ? 'نەخت' : 'Cash'}
                    </span>
                    <span style={{fontSize:'7px',color:'rgba(52,211,153,0.5)',fontFamily:'monospace'}}>[F3]</span>
                  </button>

                  {/* CARD */}
                  <button
                    id="pos-card-payment-btn"
                    onClick={() => setCheckoutView('card')}
                    disabled={!cart.length || !drawer}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      gap:'1px', padding:'7px 4px',
                      background:'linear-gradient(160deg,#1e1b4b,#312e81)',
                      border:'1px solid rgba(99,102,241,0.3)',
                      borderRadius:'5px',
                      color:'#818cf8',
                      cursor: (!cart.length || !drawer) ? 'not-allowed' : 'pointer',
                      opacity: (!cart.length || !drawer) ? 0.35 : 1,
                      transition:'opacity 0.1s, transform 0.08s',
                    }}
                    onMouseDown={e => { if (cart.length && drawer) (e.currentTarget as HTMLElement).style.transform='scale(0.96)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
                  >
                    <span style={{fontSize:'14px',lineHeight:1}}>💳</span>
                    <span style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3px'}}>
                      {lang === 'ku' ? 'کارت' : 'Card'}
                    </span>
                    <span style={{fontSize:'7px',color:'rgba(99,102,241,0.5)',fontFamily:'monospace'}}>[F3]</span>
                  </button>

                  {/* SPLIT */}
                  <button
                    id="pos-split-payment-btn"
                    onClick={() => setCheckoutView('split')}
                    disabled={!cart.length || !drawer}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      gap:'1px', padding:'7px 4px',
                      background:'linear-gradient(160deg,#3b1f5e,#4c1d95)',
                      border:'1px solid rgba(168,85,247,0.25)',
                      borderRadius:'5px',
                      color:'#c084fc',
                      cursor: (!cart.length || !drawer) ? 'not-allowed' : 'pointer',
                      opacity: (!cart.length || !drawer) ? 0.35 : 1,
                      transition:'opacity 0.1s, transform 0.08s',
                    }}
                    onMouseDown={e => { if (cart.length && drawer) (e.currentTarget as HTMLElement).style.transform='scale(0.96)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
                  >
                    <span style={{fontSize:'14px',lineHeight:1}}>⚖️</span>
                    <span style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.3px'}}>
                      {lang === 'ku' ? 'دووبەش' : 'Split'}
                    </span>
                    <span style={{fontSize:'7px',color:'rgba(168,85,247,0.45)',fontFamily:'monospace'}}>Mix</span>
                  </button>
                </div>

                {/* SECONDARY 2×2 GRID: Exact Cash | Recall | Park | Void */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px'}}>
                  {/* Exact Cash [F2] */}
                  <button
                    onClick={() => { if (cart.length && drawer) { void triggerCheckout(true); } }}
                    disabled={!cart.length || !drawer}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
                      padding:'5px 6px',
                      background:'rgba(6,78,59,0.25)',
                      border:'1px solid rgba(52,211,153,0.12)',
                      borderRadius:'4px',
                      color:'#6ee7b7',
                      fontSize:'9px', fontWeight:700,
                      cursor: (!cart.length || !drawer) ? 'not-allowed' : 'pointer',
                      opacity: (!cart.length || !drawer) ? 0.3 : 1,
                      transition:'background 0.1s',
                    }}
                  >
                    <span style={{fontSize:'11px'}}>⚡</span>
                    <span style={{lineHeight:1}}>
                      {lang === 'ku' ? 'نەختی تەواو' : 'Exact Cash'}
                      <span style={{display:'block',fontSize:'7px',color:'rgba(110,231,183,0.4)',fontFamily:'monospace',lineHeight:1}}>[F2]</span>
                    </span>
                  </button>

                  {/* Recall Parked */}
                  <button
                    onClick={() => { void loadHoldsCount(); setActiveModal('holds'); }}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
                      padding:'5px 6px',
                      background: holdsCount > 0 ? 'rgba(120,85,0,0.25)' : 'rgba(255,255,255,0.03)',
                      border: holdsCount > 0 ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.07)',
                      borderRadius:'4px',
                      color: holdsCount > 0 ? '#fbbf24' : '#475569',
                      fontSize:'9px', fontWeight:700,
                      cursor:'pointer',
                      transition:'background 0.1s',
                    }}
                  >
                    <span style={{fontSize:'11px'}}>📥</span>
                    <span style={{lineHeight:1}}>
                      {lang === 'ku' ? 'هێنانەوە' : 'Recall'}
                      <span style={{display:'block',fontSize:'7px',color: holdsCount > 0 ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.15)',fontFamily:'monospace',lineHeight:1}}>({holdsCount})</span>
                    </span>
                  </button>

                  {/* Park Basket [F5] */}
                  <button
                    onClick={() => void saveHold()}
                    disabled={!cart.length}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
                      padding:'5px 6px',
                      background:'rgba(255,255,255,0.03)',
                      border:'1px solid rgba(255,255,255,0.07)',
                      borderRadius:'4px',
                      color:'#64748b',
                      fontSize:'9px', fontWeight:700,
                      cursor: !cart.length ? 'not-allowed' : 'pointer',
                      opacity: !cart.length ? 0.3 : 1,
                      transition:'background 0.1s',
                    }}
                  >
                    <span style={{fontSize:'11px'}}>📂</span>
                    <span style={{lineHeight:1}}>
                      {lang === 'ku' ? 'ڕاگرتن' : 'Park'}
                      <span style={{display:'block',fontSize:'7px',color:'rgba(255,255,255,0.15)',fontFamily:'monospace',lineHeight:1}}>[F5]</span>
                    </span>
                  </button>

                  {/* Void Sale [F8] */}
                  <button
                    onClick={handleVoidTransaction}
                    disabled={!cart.length}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
                      padding:'5px 6px',
                      background:'rgba(239,68,68,0.06)',
                      border:'1px solid rgba(239,68,68,0.15)',
                      borderRadius:'4px',
                      color:'#f87171',
                      fontSize:'9px', fontWeight:700,
                      cursor: !cart.length ? 'not-allowed' : 'pointer',
                      opacity: !cart.length ? 0.3 : 1,
                      transition:'background 0.1s',
                    }}
                  >
                    <span style={{fontSize:'11px'}}>🚫</span>
                    <span style={{lineHeight:1}}>
                      {lang === 'ku' ? 'پوچەڵکردن' : 'Void'}
                      <span style={{display:'block',fontSize:'7px',color:'rgba(239,68,68,0.35)',fontFamily:'monospace',lineHeight:1}}>[F8]</span>
                    </span>
                  </button>
                </div>

              </div>
            </div>

            {/* ── Inline Cash Panel ── */}
            {checkoutView === 'cash' && (
              <div style={{animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)'}}>
                <InlineCashPanel
                  saleTotal={total}
                  lang={lang}
                  onConfirm={(received, change, notes) => {
                    void notes;
                    handleInlineCashConfirm(received, change);
                  }}
                  onBack={() => setCheckoutView('menu')}
                />
              </div>
            )}

            {/* ── Inline Card Panel ── */}
            {checkoutView === 'card' && (
              <div style={{animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)'}}>
                <InlineCardPanel
                  saleTotal={total}
                  lang={lang}
                  onConfirm={handleInlineCardConfirm}
                  onBack={() => setCheckoutView('menu')}
                />
              </div>
            )}

            {/* ── Inline Split Panel ── */}
            {checkoutView === 'split' && (
              <div style={{animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)'}}>
                <InlineSplitPanel
                  saleTotal={total}
                  lang={lang}
                  onConfirm={handleInlineSplitConfirm}
                  onBack={() => setCheckoutView('menu')}
                />
              </div>
            )}

            {/* Sale success banner */}
            {sale && checkoutView === 'menu' && (
              <div style={{
                margin:'0 8px 6px',
                borderRadius:'5px',
                border:'1px solid rgba(52,211,153,0.2)',
                background:'rgba(6,78,59,0.15)',
                padding:'6px 8px',
              }}>
                <p style={{fontSize:'9px',color:'#6ee7b7',fontWeight:800}}>✓ {t.transactionComplete}: R-{sale.receiptNumber}</p>
                <div style={{display:'flex',gap:'10px',marginTop:'3px'}}>
                  <a
                    style={{fontSize:'9px',color:'#fbbf24',fontWeight:700,textDecoration:'underline'}}
                    href={apiUrl(`/sales/${sale.id}/receipt.pdf`)}
                    target="_blank"
                    rel="noreferrer"
                  >📄 {t.downloadReceipt}</a>
                  <button
                    style={{fontSize:'9px',color:'#fbbf24',fontWeight:700,textDecoration:'underline',background:'none',border:'none',cursor:'pointer',padding:0}}
                    onClick={() => printReceipt(sale, lang, testMode, showNotification)}
                  >🖨️ {t.reprintReceipt}</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* ── END LEFT CART PANEL ── */}

        {/* ── CENTER: COMPACT PRODUCT GRID ── */}
        <div
          className="flex flex-1 flex-col border-l border-r border-white/5 bg-slate-950"
          style={{alignSelf:'flex-start', overflow:'visible'}}
        >

          {/* Barcode / Search bar */}
          <form onSubmit={handleBarcodeSubmit} className="flex-shrink-0 flex items-center gap-0 border-b border-white/8 bg-[#0d0d12]" style={{height:'34px'}}>
            <span className="text-emerald-400 text-[10px] font-mono tracking-widest px-2 flex-shrink-0 select-none">[F1]</span>
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                className="w-full h-full bg-transparent py-1.5 pl-1 pr-8 text-[11px] font-mono text-white placeholder-slate-600 focus:outline-none"
                placeholder={isRtl ? 'گەڕان / بارکۆد...' : 'Scan barcode or search...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                dir={isRtl ? 'rtl' : 'ltr'}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </div>
          </form>

          {/* Compact product grid — exactly 3 visible rows, then scroll */}
          <div
            style={{
              height: '275px',
              overflowY: 'auto',
              overflowX: 'hidden',
              flexShrink: 0,
              scrollbarWidth: 'thin',
              scrollbarColor: '#1e293b transparent',
            }}
          >
            {filteredProducts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-600">
                <span className="text-xl mb-1">🔍</span>
                <p className="text-[9px] font-semibold uppercase tracking-wider">
                  {isRtl ? 'هیچ بەرهەمێک نەدۆزرایەوە' : 'No products found'}
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '2px',
                padding: '2px',
                alignContent: 'start',
              }}>
                {filteredProducts.map((p) => {
                  const isLowStock = p.stockQuantity <= p.lowStockThreshold;
                  const unitLabel = p.unit === 'KG' ? 'kg' : p.unit === 'LITER' ? 'L' : 'pc';
                  const style = categoryStyles[p.category.slug] || defaultCategoryStyle;
                  const hasPromo = activePromos.some((promo) => promo.affectedItems.includes(p.id));
                  const localizedName = productTranslations[p.sku]?.[lang] || p.name;
                  const cartItem = cart.find((item) => item.product.id === p.id);
                  const qtyInCart = cartItem ? cartItem.quantity : 0;
                  const outOfStock = p.stockQuantity <= 0;

                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      disabled={outOfStock}
                      title={`${localizedName} — ${formatCurrency(Number(p.price))}/${unitLabel}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        border: qtyInCart > 0
                          ? '2px solid #22c55e'
                          : outOfStock
                          ? '1px solid rgba(239,68,68,0.18)'
                          : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '2px',
                        background: qtyInCart > 0 ? 'rgba(21,128,61,0.15)' : '#0f1117',
                        cursor: outOfStock ? 'not-allowed' : 'pointer',
                        opacity: outOfStock ? 0.38 : 1,
                        transition: 'border-color 0.08s',
                        boxShadow: qtyInCart > 0 ? '0 0 5px rgba(34,197,94,0.3)' : 'none',
                        minWidth: 0,
                        position: 'relative',
                      }}
                    >
                      {/* RED PRICE BAR — TOP */}
                      <div style={{
                        background: hasPromo
                          ? 'linear-gradient(90deg,#6d28d9,#7c3aed)'
                          : 'linear-gradient(90deg,#b91c1c,#dc2626)',
                        padding: '1px 2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                        lineHeight: 1,
                        height: '13px',
                      }}>
                        <span style={{
                          color: '#fff',
                          fontSize: '8px',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          letterSpacing: '-0.4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {formatCurrency(Number(p.price))}
                        </span>
                        <span style={{
                          color: 'rgba(255,255,255,0.55)',
                          fontSize: '6px',
                          fontWeight: 700,
                          flexShrink: 0,
                          marginLeft: '1px',
                        }}>/{unitLabel}</span>
                      </div>

                      {/* PRODUCT IMAGE — fixed 62px tall, ~70% of card */}
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '62px',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {p.imageUrl ? (
                          <img
                            src={apiUrl(p.imageUrl)}
                            alt={localizedName}
                            style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
                          />
                        ) : (
                          <div style={{
                            width:'100%',height:'100%',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            background: `linear-gradient(135deg,#0c0f1a,#111827)`,
                          }}>
                            <span style={{fontSize:'22px',lineHeight:1,userSelect:'none'}}>{style.emoji}</span>
                          </div>
                        )}

                        {/* PROMO micro-badge */}
                        {hasPromo && (
                          <span style={{
                            position:'absolute',top:1,left:1,
                            background:'#7c3aed',color:'#fff',
                            fontSize:'6px',fontWeight:900,padding:'1px 2px',
                            borderRadius:'1px',textTransform:'uppercase',
                          }}>%</span>
                        )}

                        {/* CART QTY badge */}
                        {qtyInCart > 0 && (
                          <span style={{
                            position:'absolute',top:1,right:1,
                            background:'#22c55e',color:'#000',
                            minWidth:13,height:13,
                            borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:'7px',fontWeight:900,padding:'0 1px',
                            boxShadow:'0 0 4px rgba(34,197,94,0.9)',
                          }}>
                            {p.unit === 'KG' || p.unit === 'LITER' ? `${qtyInCart.toFixed(1)}` : `${qtyInCart}×`}
                          </span>
                        )}

                        {/* STOCK badge */}
                        <span style={{
                          position:'absolute',bottom:0,right:0,
                          background: p.stockQuantity <= 0
                            ? 'rgba(127,29,29,0.95)'
                            : isLowStock
                            ? 'rgba(120,53,15,0.9)'
                            : 'rgba(0,0,0,0.45)',
                          color: p.stockQuantity <= 0 ? '#fca5a5' : isLowStock ? '#fde68a' : '#6b7280',
                          fontSize:'6px',fontWeight:700,fontFamily:'monospace',
                          padding:'0 2px',lineHeight:'10px',
                        }}>
                          {p.stockQuantity <= 0 ? '✕' : p.stockQuantity}
                        </span>
                      </div>

                      {/* RED NAME BAR — BOTTOM */}
                      <div style={{
                        background: 'linear-gradient(90deg,#991b1b,#7f1d1d)',
                        padding: '1px 2px',
                        flexShrink: 0,
                        height: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                      }}>
                        <span style={{
                          color: '#fecaca',
                          fontSize: '7px',
                          fontWeight: 700,
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: '100%',
                          textAlign: isRtl ? 'right' : 'left',
                          lineHeight: 1,
                        }}>
                          {localizedName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* ── END CENTER PRODUCT GRID ── */}

        {/* ── RIGHT: VERTICAL CATEGORY SIDEBAR ── */}
        <div style={{
          width: '52px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#08090f',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Sidebar label */}
          <div style={{
            padding: '3px 2px',
            textAlign: 'center',
            background: '#0a0c15',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <span style={{fontSize:'6px', fontWeight:900, color:'#334155', textTransform:'uppercase', letterSpacing:'0.8px'}}>CAT</span>
          </div>

          {/* Scrollable category buttons */}
          <div style={{
            flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'1px', padding:'1px',
            scrollbarWidth:'none',
          }}>
            {/* ALL button */}
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 1px',
                borderRadius: '2px',
                border: selectedCategory === 'all' ? '1px solid rgba(59,130,246,0.7)' : '1px solid rgba(255,255,255,0.04)',
                background: selectedCategory === 'all'
                  ? 'linear-gradient(160deg,#1d4ed8,#1e40af)'
                  : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                gap: '1px',
                flexShrink: 0,
                transition: 'all 0.08s',
                boxShadow: selectedCategory === 'all' ? '0 0 6px rgba(59,130,246,0.35)' : 'none',
              }}
            >
              <span style={{fontSize:'12px', lineHeight:1}}>⭐</span>
              <span style={{
                fontSize: '6px',
                fontWeight: 900,
                color: selectedCategory === 'all' ? '#bfdbfe' : '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.2px',
                textAlign: 'center',
                lineHeight: 1,
              }}>ALL</span>
            </button>

            {categories.map((cat) => {
              const style = categoryStyles[cat.slug] || defaultCategoryStyle;
              const isSelected = selectedCategory === cat.id;
              const localizedCatName = categoryTranslations[cat.slug]?.[lang] || cat.name;
              const shortName = localizedCatName.length > 6 ? localizedCatName.slice(0, 5) + '.' : localizedCatName;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  title={localizedCatName}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px 1px',
                    borderRadius: '2px',
                    border: isSelected ? '1px solid rgba(59,130,246,0.7)' : '1px solid rgba(255,255,255,0.04)',
                    background: isSelected
                      ? 'linear-gradient(160deg,#1d4ed8,#1e40af)'
                      : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    gap: '1px',
                    flexShrink: 0,
                    transition: 'all 0.08s',
                    boxShadow: isSelected ? '0 0 6px rgba(59,130,246,0.35)' : 'none',
                  }}
                >
                  <span style={{fontSize:'12px', lineHeight:1}}>{style.emoji}</span>
                  <span style={{
                    fontSize: '6px',
                    fontWeight: 900,
                    color: isSelected ? '#bfdbfe' : '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1px',
                    textAlign: 'center',
                    lineHeight: 1,
                    wordBreak: 'break-all',
                    maxWidth: '46px',
                  }}>{shortName}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* ── END RIGHT CATEGORY SIDEBAR ── */}

      </section>

      {/* 3. TERMINAL ACTION FOOTER BAR */}
      <footer className="flex h-16 items-center justify-between rounded-xl bg-slate-900 border border-white/10 px-4 shadow-[0_-4px_15px_rgba(0,0,0,0.3)] flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAppliedCoupon(null);
              setCouponCode('');
              setActiveModal('coupon');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-950 hover:text-white transition-colors"
          >
            🎟️ {t.applyCoupon}
          </button>

          <button
            onClick={() => setActiveModal('refund')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-950 hover:text-white transition-colors"
          >
            🔄 {t.refundLookup}
          </button>

          <button
            onClick={() => {
              setDrawerFloatInput('100000');
              setActiveModal('drawer');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-950 hover:text-white transition-colors"
          >
            🪙 {t.cashTillSession}
          </button>

          <button
            onClick={handleShowZReport}
            className="flex items-center gap-1.5 rounded-lg border border-gold-500/20 bg-gold-500/5 px-4 py-2.5 text-xs font-bold text-gold-400 hover:bg-gold-500 hover:text-slate-950 transition-colors"
          >
            📊 {t.shiftZReport}
          </button>
        </div>

        <div>
          <button
            onClick={() => {
              void loadHoldsCount();
              setActiveModal('holds');
            }}
            className={`rounded-lg px-4 py-2.5 text-xs font-bold border transition-all ${
              holdsCount > 0
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 animate-pulse'
                : 'bg-slate-950 border-white/10 text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            📥 {t.recallHolds} ({holdsCount})
          </button>
        </div>
      </footer>

      {/* Dynamic premium toast overlay */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 transform rounded-xl border border-gold-500/20 bg-slate-900 px-6 py-3 shadow-[0_0_24px_rgba(232,184,79,0.15)] backdrop-blur-md transition-all">
          <div className="flex items-center gap-3">
            <span className="text-sm">
              {toast.type === 'success' ? '🟢' : toast.type === 'error' ? '🔴' : '💡'}
            </span>
            <p className="text-xs font-extrabold tracking-tight text-white">{toast.message}</p>
          </div>
        </div>
      )}

      {/* MODAL: PIN VERIFICATION CODE */}
      {activeModal === 'pin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[360px] rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 mb-2">
              🚨 {t.pinRequired}
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">{pinCallback?.label}</p>

            {pinError && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400 font-bold">
                {pinError}
              </div>
            )}

            <input
              type="password"
              placeholder="••••"
              maxLength={6}
              className="w-full text-center rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xl font-mono text-white focus:outline-none focus:border-red-400"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleVerifyPIN();
              }}
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={closeModals}
                className="flex-1 rounded-xl border border-white/15 bg-transparent py-2.5 text-xs font-semibold hover:bg-white/5"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleVerifyPIN}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-500"
              >
                {t.verify}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AGE CONFIRMATION VERIFY */}
      {activeModal === 'age' && ageProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[380px] rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-center">
            <span className="text-4xl">🔞</span>
            <h3 className="text-base font-bold uppercase tracking-wider text-red-400 mt-2 mb-2">
              {t.ageVerification}
            </h3>
            <p className="text-xs text-slate-300 px-2 leading-relaxed">
              {t.ageRestrictionText} <strong className="text-white text-sm font-black">{ageProduct.minAge}</strong>.
            </p>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">{ageProduct.name}</p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={closeModals}
                className="flex-1 rounded-xl border border-white/15 bg-transparent py-2.5 text-xs font-semibold hover:bg-white/5"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmAgeVerification}
                className="flex-1 rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-gold-400"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WEIGHT TILL SCALE CALIBRATION */}
      {activeModal === 'weight' && scaleProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[380px] rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold uppercase tracking-wider text-gold-400 mb-1">
              ⚖️ {t.weightVerification}
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">{scaleProduct.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">{t.scaleWeight}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-mono text-white focus:outline-none"
                    value={scaleWeight}
                    onChange={(e) => setScaleWeight(e.target.value)}
                  />
                  <button
                    onClick={handleSimulateScale}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold hover:bg-white/10"
                  >
                    🔄 {t.simulateScale}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={closeModals}
                className="flex-1 rounded-xl border border-white/15 bg-transparent py-2.5 text-xs font-semibold hover:bg-white/5"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleWeightConfirm}
                className="flex-1 rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-gold-400"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISCOUNT COUPONS */}
      {activeModal === 'coupon' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[380px] rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold uppercase tracking-wider text-gold-400 mb-4">
              🎟️ {t.applyCoupon}
            </h3>

            <div className="space-y-3">
              <input
                type="text"
                placeholder={t.couponPlaceholder}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm uppercase text-white focus:outline-none focus:border-gold-400"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />

              <div className="flex gap-2">
                <button
                  onClick={closeModals}
                  className="flex-1 rounded-xl border border-white/15 bg-transparent py-2.5 text-xs font-semibold hover:bg-white/5"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleApplyCoupon}
                  className="flex-1 rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-gold-400"
                >
                  {t.apply}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REFUND WIDGET */}
      {activeModal === 'refund' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[500px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl scrollbar-thin">
            <h3 className="text-base font-bold uppercase tracking-wider text-gold-400 mb-4">
              🔄 {t.refundReceipt}
            </h3>

            {refundSuccessPdf ? (
              <div className="rounded-xl border border-mint-500/20 bg-mint-500/10 p-4 text-center">
                <p className="text-sm text-mint-300 font-bold mb-2">{t.refundApproved}</p>
                <a
                  href={refundSuccessPdf}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-gold-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-gold-400 inline-block"
                >
                  🖨️ {t.reprintReceipt}
                </a>
                <button
                  onClick={closeModals}
                  className="block mt-4 text-xs font-semibold text-slate-400 hover:underline mx-auto"
                >
                  {t.close}
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400"
                    placeholder="R-1..."
                    value={refundReceipt}
                    onChange={(e) => setRefundReceipt(e.target.value)}
                  />
                  <button
                    onClick={handleLookupReceipt}
                    className="rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-gold-400"
                  >
                    {t.find}
                  </button>
                </div>

                {refundSale && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-950 p-3 text-xs border border-white/5 space-y-1">
                      <p><span className="text-slate-400">{t.date}:</span> {formatDate(refundSale.createdAt)}</p>
                      <p><span className="text-slate-400">{t.cashier}:</span> {refundSale.user.name}</p>
                      <p><span className="text-slate-400">{t.total}:</span> {formatCurrency(Number(refundSale.total))}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-white uppercase tracking-wider">{t.allItems}</p>
                      {refundSale.items.map((item: any) => {
                        const maxQty = item.quantity;
                        const currQty = refundQuantities[item.productId] ?? 0;
                        const localizedItemName = productTranslations[item.product.sku]?.[lang] || item.productName;

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2.5 rounded-lg bg-slate-950 p-2.5 border border-white/5 text-xs"
                          >
                            <span className="flex-1 truncate">{localizedItemName}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={maxQty}
                                className="w-14 text-center rounded bg-slate-900 border border-white/10 p-1 font-mono text-white"
                                value={currQty}
                                onChange={(e) =>
                                  handleItemRefundQtyChange(item.productId, Number(e.target.value), maxQty)
                                }
                              />
                              <span className="text-slate-400 font-mono">/ {maxQty}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{t.reason}</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-xs text-white focus:outline-none"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={closeModals}
                        className="flex-1 rounded-xl border border-white/15 bg-transparent py-2.5 text-xs font-semibold hover:bg-white/5"
                      >
                        {t.cancel}
                      </button>
                      <button
                        onClick={handleProcessRefundSubmit}
                        className="flex-1 rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-gold-400"
                      >
                        {t.confirm}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DRAWER SHIFT MANAGEMENT */}
      {activeModal === 'drawer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[450px] rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gold-400">
                🪙 {t.cashTillSession}
              </h3>
              <button onClick={closeModals} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {drawerLoading ? (
              <p className="text-center text-xs text-slate-400 py-8">Loading drawer session...</p>
            ) : !drawer ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t.openingFloatRequired}
                </p>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t.openingFloat}</label>
                  <input
                    type="number"
                    step="1"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-mono text-white focus:outline-none"
                    value={drawerFloatInput}
                    onChange={(e) => setDrawerFloatInput(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleOpenDrawer}
                  className="w-full rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-gold-400"
                >
                  🚀 {t.openSession}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-950 p-4 border border-white/5 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.activeSession}:</span>
                    <span className="text-mint-400 font-bold">#{drawer.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.openingFloat}:</span>
                    <span>{formatCurrency(Number(drawer.openingFloat))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.date}:</span>
                    <span>{formatDate(drawer.openedAt)}</span>
                  </div>
                </div>

                {/* Cash in / out movement loggers */}
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-3">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Log Till Adjustment</p>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{t.amount}</label>
                    <input
                      type="number"
                      step="1"
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:outline-none"
                      value={cashMovementAmount}
                      onChange={(e) => setCashMovementAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{t.reason}</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none"
                      value={cashMovementReason}
                      onChange={(e) => setCashMovementReason(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCashMovement('CASH_IN')}
                      className="flex-1 rounded bg-slate-900 border border-white/10 hover:bg-slate-950 text-white font-bold py-1.5 text-[10px]"
                    >
                      📥 {t.cashIn}
                    </button>
                    <button
                      onClick={() => handleCashMovement('CASH_OUT')}
                      className="flex-1 rounded bg-slate-900 border border-white/10 hover:bg-slate-950 text-white font-bold py-1.5 text-[10px]"
                    >
                      📤 {t.cashOut}
                    </button>
                  </div>
                </div>

                {/* Close Session Shift Input */}
                <div className="border-t border-white/5 pt-3">
                  <label className="block text-xs text-slate-400 mb-1">{t.closingFloat}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="1"
                      className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-mono text-white focus:outline-none"
                      value={drawerFloatInput}
                      onChange={(e) => setDrawerFloatInput(e.target.value)}
                    />
                    <button
                      onClick={handleCloseDrawer}
                      className="rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-500 transition-colors"
                    >
                      🏁 {t.closeSession}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SHIFT Z-REPORT DETAIL */}
      {activeModal === 'zreport' && zReportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[450px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl scrollbar-thin">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gold-400 uppercase tracking-wider">{t.zReport}</h3>
              <p className="text-xs text-slate-400">{t.zReportDescription}</p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-white/5 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Session Start:</span>
                <span>{formatDate(zReportData.sessionStart)}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Session End:</span>
                <span>{formatDate(zReportData.sessionEnd)}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">{t.cashier}:</span>
                <span className="font-bold">{zReportData.cashier}</span>
              </div>

              <div className="h-[1px] bg-white/10 my-3" />

              <div className="flex justify-between">
                <span className="text-slate-400">{t.floatStart}:</span>
                <span>{formatCurrency(zReportData.openingFloat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.cashPayments}:</span>
                <span>{formatCurrency(zReportData.cashSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.cardPayments}:</span>
                <span>{formatCurrency(zReportData.cardSales)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Total Voids ({zReportData.voidsCount}):</span>
                <span>-{formatCurrency(zReportData.totalVoids)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Total Refunds ({zReportData.refundsCount}):</span>
                <span>-{formatCurrency(zReportData.totalRefunds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.cashIn}:</span>
                <span>+{formatCurrency(zReportData.cashIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.cashOut}:</span>
                <span>-{formatCurrency(zReportData.cashOut)}</span>
              </div>

              <div className="h-[1px] bg-white/10 my-3" />

              <div className="flex justify-between font-bold text-white">
                <span>{t.expectedDrawerCash}:</span>
                <span>{formatCurrency(zReportData.expectedCash)}</span>
              </div>
              {zReportData.closingFloat !== undefined && (
                <>
                  <div className="flex justify-between font-bold text-white">
                    <span>{t.countedDrawerCash}:</span>
                    <span>{formatCurrency(zReportData.closingFloat)}</span>
                  </div>
                  <div
                    className={`flex justify-between font-bold border-t border-white/5 pt-1.5 ${
                      Number(zReportData.difference) >= 0 ? 'text-mint-400' : 'text-red-400'
                    }`}
                  >
                    <span>{t.overShortAudit}:</span>
                    <span>
                      {Number(zReportData.difference) >= 0 ? '+' : ''}
                      {formatCurrency(zReportData.difference ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors"
              >
                🖨️ {t.printAuditor}
              </button>
              <button
                onClick={closeModals}
                className="flex-1 rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-gold-400 transition-colors"
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECALL PARKED DIALOG */}
      {activeModal === 'holds' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[500px] max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl scrollbar-thin">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gold-400">
                📥 {t.recallHolds}
              </h3>
              <button onClick={closeModals} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {holds.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">{t.noParkedBaskets}</p>
            ) : (
              <div className="space-y-2">
                {holds.map((hold) => {
                  const payload = (typeof hold.payload === 'string' ? JSON.parse(hold.payload) : hold.payload) as HoldPayload;
                  const items = payload?.items || [];
                  const itemCount = items.reduce((s, item) => s + item.quantity, 0);

                  return (
                    <button
                      key={hold.id}
                      onClick={() => void resumeHold(hold)}
                      className={`w-full rounded-xl border border-white/5 bg-slate-950/40 p-4 ${
                        isRtl ? 'text-right' : 'text-left'
                      } transition hover:border-gold-500/30 hover:bg-slate-950`}
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-white">{t.basketId}: #{hold.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-slate-400">{t.cashier}: {hold.cashier?.name}</p>
                          <p className="text-[10px] text-slate-400">{t.itemsCountLabel}: {itemCount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">{formatDate(hold.updatedAt)}</p>
                          <span className="mt-1 inline-block rounded bg-gold-500/10 px-2.5 py-1 text-[10px] font-bold text-gold-400">
                            {t.recallBasketBtn}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Split pay modal removed — now handled inline via checkoutView state */}
    </div>
  );
}
