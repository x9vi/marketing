import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import type { Customer, Hold, PaymentMethod, Product, Sale, DiscountType, CashDrawer, ZReport, PromotionMatch } from '../api/types.js';
import { formatCurrency, formatDate } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.js';
import { useSettings } from '../context/SettingsContext.js';
import { Link } from 'react-router-dom';
import { InlineCashPanel } from '../components/InlineCashPanel.js';
import { InlineCardPanel } from '../components/InlineCardPanel.js';
import { InlineSplitPanel } from '../components/InlineSplitPanel.js';
import { loadHardwareSettings, popCashDrawer, printSaleReceipt, type HardwareSettings, defaultHardwareSettings } from '../lib/hardware.js';

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

/**
 * buildReceiptHtml — Generates the 72mm thermal receipt HTML string.
 * Pure function: no DOM side-effects, reusable by hardware.ts printSaleReceipt().
 */
const buildReceiptHtml = (sale: any, lang: 'en' | 'ku', t: typeof translations['en'], settings: any): string => {
  const isRtl = lang === 'ku';
  const currencyCode = settings?.store?.currency || 'IQD';

  const itemsHtml = (sale.items || []).map((item: any) => {
    const localizedName = productTranslations[item.sku]?.[lang] || item.productName;
    return `
      <tr>
        <td style="padding: 4px 0; font-size: 12px; font-family: monospace; text-align: ${isRtl ? 'right' : 'left'};">
          ${localizedName}<br/>
          <span style="font-size: 11px; color: #444;">${item.quantity} x ${Number(item.unitPrice).toLocaleString('ar-IQ')} ${currencyCode}</span>
        </td>
        <td style="text-align: ${isRtl ? 'left' : 'right'}; vertical-align: bottom; padding: 4px 0; font-size: 12px;">
          ${Number(item.lineTotal).toLocaleString('ar-IQ')} ${currencyCode}
        </td>
      </tr>
    `;
  }).join('');

  const paymentsHtml = (sale.payments || []).map((p: any) => `
    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px; direction: ${isRtl ? 'rtl' : 'ltr'};">
      <span>${t.paid} (${p.method === 'CASH' ? t.cash : t.card}):</span>
      <span>${Number(p.amount).toLocaleString('ar-IQ')} ${currencyCode}</span>
    </div>
  `).join('');

  return `
    <html>
      <head>
        <title>Receipt ${sale.receiptNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap');
          @page { margin: 0; }
          body {
            font-family: ${isRtl ? "'Noto Sans Arabic', monospace" : "monospace"};
            width: 72mm; margin: 0; padding: 10px;
            font-size: 12px; line-height: 1.35; color: #000; background: #fff;
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
        ${settings?.receipt?.printLogo && settings?.store?.logoUrl ? `<div class="center"><img src="${settings.store.logoUrl}" style="max-height:60px;margin-bottom:8px;"/></div>` : ''}
        <div class="center">
          <span style="font-size: 16px;" class="bold">${settings?.store?.name || 'Store'}</span><br/>
          ${settings?.receipt?.printStoreInfo ? `
            <span>${settings?.store?.address || ''}</span><br/>
            <span>Tel: ${settings?.store?.phone || ''}</span>
          ` : ''}
        </div>
        <div class="divider"></div>
        <div style="font-size: 11px;">
          <span>${t.receipt} #: ${sale.receiptNumber}</span><br/>
          ${settings?.receipt?.printDateTime ? `<span>${t.date}: ${new Date(sale.createdAt).toLocaleString(isRtl ? 'ku-IQ' : 'en-US')}</span><br/>` : ''}
          ${settings?.receipt?.printCashierName ? `<span>${t.cashier}: ${sale.user?.name || 'Staff'}</span>` : ''}
          ${sale.customer ? `<br/><span>${t.customer}: ${sale.customer.name}</span>` : ''}
        </div>
        <div class="divider"></div>
        <table>
          <thead><tr>
            <th class="bold" style="font-size: 12px;">${t.allItems}</th>
            <th class="bold" style="text-align: ${isRtl ? 'left' : 'right'}; font-size: 12px;">${t.total}</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between;" class="bold">
          <span>${t.subtotal}:</span>
          <span>${Number(sale.subtotal).toLocaleString('ar-IQ')} ${currencyCode}</span>
        </div>
        ${Number(sale.discountAmount) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>${t.discount}:</span>
          <span>-${Number(sale.discountAmount).toLocaleString('ar-IQ')} ${currencyCode}</span>
        </div>` : ''}
        ${Number(sale.couponDiscount) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>${t.coupon}:</span>
          <span>-${Number(sale.couponDiscount).toLocaleString('ar-IQ')} ${currencyCode}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between;" class="bold">
          <span>${t.total}:</span>
          <span>${Number(sale.total).toLocaleString('ar-IQ')} ${currencyCode}</span>
        </div>
        <div class="divider"></div>
        ${paymentsHtml}
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px;">
          <span>${t.changeDue}:</span>
          <span>${Number(sale.changeAmount).toLocaleString('ar-IQ')} ${currencyCode}</span>
        </div>
        ${sale.pointsEarned ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
          <span>${t.pointsEarned}:</span>
          <span>+${sale.pointsEarned}</span>
        </div>` : ''}
        <div class="divider"></div>
        <div class="center" style="margin-top: 15px; font-size: 11px;">
          ${settings?.receipt?.header || 'Thank you!'}<br/>
          ${settings?.receipt?.footer || ''}
        </div>
        <div style="height: 35px;"></div>
      </body>
    </html>
  `;
};

/** Legacy wrapper — kept so any remaining call sites that pass testMode still work. */
const printReceipt = (sale: any, lang: 'en' | 'ku', testMode: boolean, triggerToast?: (msg: string) => void, settings?: any) => {
  const t = translations[lang];
  if (testMode && triggerToast) triggerToast(`🖨️ ${t.printSuccess} | 🪙 ${t.drawerSuccess}`);
  printSaleReceipt(buildReceiptHtml(sale, lang, t, settings));
};

export function POSPage() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const isAdmin = user?.role === 'ADMIN';
  const isCashier = user?.role === 'CASHIER';

  // Localization and hardware test states
  const [lang, setLang] = useState<'en' | 'ku'>('en');
  const [testMode, setTestMode] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Hardware settings
  const [hwSettings, setHwSettings] = useState<HardwareSettings>(defaultHardwareSettings);

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
    // Load hardware settings (non-blocking, uses defaults on failure)
    loadHardwareSettings().then(setHwSettings).catch(() => {});
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

      // ── Sale saved ── now handle hardware (non-blocking, errors shown as warnings)
      const hasCash = checkoutPayments.some(p => p.method === 'CASH');

      // 1. Auto pop cash drawer if enabled and payment includes cash
      if (hasCash && hwSettings.cashDrawer.enabled) {
        const popResult = await popCashDrawer(hwSettings, 'Sale completed');
        if (!popResult.ok) {
          showNotification(`⚠️ ${lang === 'ku' ? 'سندوقی نەختی نەکرایەوە' : 'Cash drawer could not open'}: ${popResult.error ?? ''}`, 'error');
        } else {
          showNotification(`🪙 ${lang === 'ku' ? 'سندوقی نەختی کرایەوە' : t.drawerSuccess}`, 'info');
        }
      }

      // 2. Print receipt
      const receiptHtml = buildReceiptHtml(result.sale, lang, t, settings);
      if (hwSettings.receiptPrinter.enabled) {
        printSaleReceipt(receiptHtml);
        showNotification(`🖨️ ${t.printSuccess}`, 'info');
      } else if (testMode) {
        printSaleReceipt(receiptHtml);
        showNotification(`🖨️ ${t.printSuccess} | 🪙 ${t.drawerSuccess}`, 'info');
      }

      setSale(result.sale);
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

  // Manual cash drawer pop handler (with PIN guard for cashiers)
  const handleManualDrawerPop = useCallback((reason?: string) => {
    const doPopDrawer = async () => {
      const popResult = await popCashDrawer(hwSettings, reason ?? 'Manual open');
      if (popResult.ok) {
        showNotification(`🪙 ${lang === 'ku' ? 'سندوقی نەختی کرایەوە' : t.drawerSuccess}`, 'success');
      } else {
        showNotification(`⚠️ ${lang === 'ku' ? 'کرانەوەی سندوق سەرکەوتوو نەبوو' : 'Drawer open failed'}: ${popResult.error ?? ''}`, 'error');
      }
    };
    triggerPINOverride(lang === 'ku' ? 'کرانەوەی سندوق' : 'Open Cash Drawer', () => { void doPopDrawer(); });
  }, [hwSettings, lang, t]);

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
      className="flex h-screen w-screen flex-col overflow-hidden font-sans select-none"
      style={{ padding: '6px', gap: '5px', display: 'flex', flexDirection: 'column', background: '#F5FBF6', color: '#111827' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between flex-row rounded-lg px-3 flex-shrink-0" style={{ height: '40px', background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black" style={{ background: 'linear-gradient(135deg,#2563EB,#1d4ed8)', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
              🛒
            </span>
            <div>
              <h1 className="text-[11px] font-black tracking-tight uppercase flex items-center gap-1" style={{ color: '#111827', lineHeight: 1.2 }}>
                FreshMart <span className="font-mono text-[9px] px-1 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>SYS-04</span>
              </h1>
              <p className="text-[9px] font-semibold font-mono" style={{ color: '#6B7280', lineHeight: 1.2 }}>
                {t.station} · {user?.name}
              </p>
            </div>
          </div>
          <div className="h-6 w-[1px]" style={{ background: '#E5E7EB' }} />
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${drawer ? 'animate-pulse' : ''}`} style={{ background: drawer ? '#16A34A' : '#DC2626', boxShadow: drawer ? '0 0 5px rgba(22,163,74,0.5)' : 'none' }} />
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: drawer ? '#16A34A' : '#DC2626' }}>
              {drawer ? t.activeSession : t.offlineSession}
            </span>
          </div>
        </div>

        <div className="flex flex-row items-center gap-2">
          {/* Language Switcher */}
          <div className="flex rounded p-0.5" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
            <button
              onClick={() => setLang('en')}
              className="px-2 py-0.5 text-[9px] font-black rounded transition-all"
              style={lang === 'en' ? { background: '#2563EB', color: '#fff' } : { color: '#6B7280' }}
            >
              EN
            </button>
            <button
              onClick={() => setLang('ku')}
              className="px-2 py-0.5 text-[9px] font-black rounded transition-all"
              style={lang === 'ku' ? { background: '#2563EB', color: '#fff' } : { color: '#6B7280' }}
            >
              کوردی
            </button>
          </div>

          {/* Exit POS back to Admin dashboard */}
          {isAdmin && (
            <Link
              to="/app"
              className="rounded px-2 py-1 text-[9px] font-black transition-all hover:opacity-80"
              style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', textDecoration: 'none' }}
            >
              🚪 {t.exitTerminal}
            </Link>
          )}

          {/* Quick logout option */}
          <button
            onClick={() => void logout()}
            className="rounded px-2 py-1 text-[9px] font-black transition-all hover:opacity-80"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
          >
            👋 {t.signOut}
          </button>
        </div>
      </header>

      {/* ── MAIN LAYOUT: 58% Checkout | 42% Product+Category ── */}
      <section
        className={`flex flex-1 overflow-hidden min-h-0 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}
        style={{ gap: '5px' }}
      >

        {/* ─────────── CHECKOUT PANEL (~58%) ─────────── */}
        <div style={{ flex: '58 0 0', minWidth: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

          {/* Cart Header */}
          <div style={{ background: '#EEF8F0', borderBottom: '2px solid #D1FAE5', padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, height: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '12px' }}>🧾</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                {isRtl ? 'سەبەتەی ئێستا' : 'CURRENT SALE'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>
                {cart.reduce((s, i) => s + i.quantity, 0)} {isRtl ? 'بابەت' : 'items'}
              </span>
              {drawer && (
                <span style={{ fontSize: '8px', color: '#16A34A', fontWeight: 700, background: '#ECFDF5', border: '1px solid #BBF7D0', padding: '0px 5px', borderRadius: '3px', fontFamily: 'monospace' }}>
                  ● LIVE
                </span>
              )}
            </div>
          </div>

          {/* Customer Badge */}
          {selectedCustomer && (
            <div style={{ borderBottom: '1px solid #E5E7EB', background: '#FFFBEB', padding: '2px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: '5px', padding: '2px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '12px' }}>👤</span>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.2 }}>{selectedCustomer.name}</p>
                    <p style={{ fontSize: '8px', color: '#6B7280', fontFamily: 'monospace', margin: 0 }}>
                      {t.points}: {selectedCustomer.loyaltyPoints}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedCustomer(null); setPointsToRedeem('0'); }}
                  style={{ color: '#DC2626', fontSize: '11px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px' }}
                >✕</button>
              </div>
            </div>
          )}

          {/* Cart Items Table */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}>
            {cart.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ fontSize: '40px', opacity: 0.12 }}>🧾</span>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
                  {isRtl ? 'سەبەتە بەتاڵ — بابەت سکان بکە' : 'TICKET EMPTY — SCAN ITEMS'}
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '95px' }} />
                  <col style={{ width: '34px' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#EEF8F0', borderBottom: '1px solid #D1FAE5', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '3px 8px 3px 12px', textAlign: 'left', fontSize: '8px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      {isRtl ? 'بابەت' : 'Item'}
                    </th>
                    <th style={{ padding: '3px 4px', textAlign: 'center', fontSize: '8px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      {isRtl ? 'ژمارە' : 'Qty'}
                    </th>
                    <th style={{ padding: '3px 4px', textAlign: 'right', fontSize: '8px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      {isRtl ? 'نرخ' : 'Price'}
                    </th>
                    <th style={{ padding: '3px 8px 3px 4px', textAlign: 'right', fontSize: '8px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      {isRtl ? 'کۆ' : 'Total'}
                    </th>
                    <th style={{ width: 28 }} />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const lineTotal = Number(item.product.price) * item.quantity;
                    const itemLabel = item.product.unit === 'KG' ? 'kg' : item.product.unit === 'LITER' ? 'L' : '';
                    const localizedName = productTranslations[item.product.sku]?.[lang] || item.product.name;

                    return (
                      <tr
                        key={item.product.id}
                        style={{
                          background: idx % 2 === 0 ? '#FFFFFF' : '#F5FBF6',
                          borderBottom: '1px solid #EEF8F0',
                          transition: 'background 0.1s',
                        }}
                      >
                        {/* Item Name + SKU */}
                        <td style={{ padding: '4px 8px 4px 12px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: isRtl ? 'rtl' : 'ltr', lineHeight: 1.25 }}>
                            {localizedName}
                          </div>
                          <div style={{ fontSize: '8px', color: '#94A3B8', fontFamily: 'monospace', marginTop: 0, letterSpacing: '0.2px' }}>
                            {item.product.sku}{itemLabel ? ` · ${itemLabel}` : ''}
                          </div>
                        </td>

                        {/* Qty Controls */}
                        <td style={{ padding: '4px 3px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: '#EEF8F0', borderRadius: '6px', padding: '1px 2px' }}>
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
                              style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #D1FAE5', borderRadius: '4px', color: '#475569', fontSize: '12px', fontWeight: 900, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
                            >−</button>
                            <span style={{ minWidth: 24, textAlign: 'center', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                              {item.product.unit === 'KG' || item.product.unit === 'LITER'
                                ? item.quantity.toFixed(2)
                                : item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                setCart((curr) =>
                                  curr.map((c) =>
                                    c.product.id === item.product.id ? { ...c, quantity: c.quantity + 1 } : c
                                  )
                                )
                              }
                              style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #D1FAE5', borderRadius: '4px', color: '#475569', fontSize: '12px', fontWeight: 900, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
                            >+</button>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td style={{ padding: '4px 3px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 600, color: '#64748B' }}>
                            {formatCurrency(Number(item.product.price))}
                          </span>
                        </td>

                        {/* Line Total */}
                        <td style={{ padding: '4px 8px 4px 3px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '11.5px', fontFamily: 'monospace', fontWeight: 800, color: '#16A34A', letterSpacing: '-0.3px' }}>
                            {formatCurrency(lineTotal)}
                          </span>
                        </td>

                        {/* Delete */}
                        <td style={{ padding: '4px 4px 4px 0', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            onClick={() => handleRemoveCartItem(item.product.id)}
                            title={t.remove}
                            style={{
                              width: 18, height: 18,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#FEE2E2', border: '1px solid #FECACA',
                              borderRadius: '4px', color: '#EF4444',
                              fontSize: '9px', fontWeight: 900,
                              cursor: 'pointer', lineHeight: 1, flexShrink: 0,
                            }}
                          >✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── TOTALS + PAYMENT SECTION ── */}
          <div style={{ borderTop: '2px solid #E2E8F0', background: '#FFFFFF', flexShrink: 0, overflowY: 'auto' }}>

            {/* Optional discount/promo lines – only shown when active */}
            {(Number(pointsToRedeem) > 0 && selectedCustomer) || (manualDiscount > 0 || couponDiscount > 0) || promoDiscount > 0 ? (
              <div style={{ padding: '3px 10px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(Number(pointsToRedeem) > 0 && selectedCustomer) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#DC2626', fontWeight: 600 }}>{t.pointsRedeemed} ({pointsToRedeem}pts)</span>
                    <span style={{ fontSize: '9px', color: '#DC2626', fontFamily: 'monospace', fontWeight: 700 }}>−{formatCurrency(customerRedeemable)}</span>
                  </div>
                )}
                {(manualDiscount > 0 || couponDiscount > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#DC2626', fontWeight: 600 }}>{t.discount}</span>
                    <span style={{ fontSize: '9px', color: '#DC2626', fontFamily: 'monospace', fontWeight: 700 }}>−{formatCurrency(manualDiscount + couponDiscount)}</span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#16A34A', fontWeight: 600 }}>Auto Promos</span>
                    <span style={{ fontSize: '9px', color: '#16A34A', fontFamily: 'monospace', fontWeight: 700 }}>−{formatCurrency(promoDiscount)}</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* GRAND TOTAL BAR */}
            <div style={{ margin: '4px 8px 3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', border: '1.5px solid #6EE7B7', borderRadius: '8px', padding: '6px 12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <span style={{ fontSize: '8px', color: '#15803D', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
                  {isRtl ? 'کۆی گشتی' : 'TOTAL DUE'}
                </span>
                <span style={{ fontSize: '8px', color: '#4ADE80', fontFamily: 'monospace', fontWeight: 600 }}>
                  {cart.length} {isRtl ? 'بابەت' : 'items'}
                </span>
              </div>
              <span style={{ fontSize: '26px', color: '#15803D', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
                {formatCurrency(total)}
              </span>
            </div>

            {/* Loyalty points slider */}
            {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
              <div style={{ margin: '0 8px 3px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '5px', padding: '3px 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '8px', color: '#6B7280', fontFamily: 'monospace' }}>Redeem (Max {selectedCustomer.loyaltyPoints} pts)</span>
                  <span style={{ fontSize: '8px', color: '#D97706', fontWeight: 700, fontFamily: 'monospace' }}>−{formatCurrency(customerRedeemable)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={selectedCustomer.loyaltyPoints}
                  value={pointsToRedeem}
                  onChange={(e) => handleRedeemPointsChange(e.target.value)}
                  style={{ width: '100%', height: '3px', accentColor: '#D97706', cursor: 'pointer', display: 'block' }}
                />
              </div>
            )}

            {/* ── PAYMENT BUTTONS (menu view) ── */}
            <div style={{
              overflow: 'hidden',
              maxHeight: checkoutView === 'menu' ? '400px' : '0px',
              opacity: checkoutView === 'menu' ? 1 : 0,
              transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
            }}>
              <div style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>

                {/* PRIMARY ROW: Cash | Card | Split — compact 32px height */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
                  {/* Cash */}
                  <button
                    id="pos-cash-payment-btn"
                    onClick={() => setCheckoutView('cash')}
                    disabled={!cart.length || !drawer}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      height: '32px',
                      background: 'linear-gradient(160deg, #34D399, #10B981)',
                      border: 'none', borderRadius: '8px', color: '#fff',
                      cursor: (!cart.length || !drawer) ? 'not-allowed' : 'pointer',
                      opacity: (!cart.length || !drawer) ? 0.4 : 1,
                      transition: 'transform 0.1s, opacity 0.15s',
                      boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
                    }}
                    onMouseDown={e => { if (cart.length && drawer) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>💵</span>
                    <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lang === 'ku' ? 'نەخت' : 'Cash'}
                    </span>
                  </button>

                  {/* Card */}
                  <button
                    id="pos-card-payment-btn"
                    onClick={() => setCheckoutView('card')}
                    disabled={!cart.length || !drawer}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      height: '32px',
                      background: 'linear-gradient(160deg, #60A5FA, #3B82F6)',
                      border: 'none', borderRadius: '8px', color: '#fff',
                      cursor: (!cart.length || !drawer) ? 'not-allowed' : 'pointer',
                      opacity: (!cart.length || !drawer) ? 0.4 : 1,
                      transition: 'transform 0.1s, opacity 0.15s',
                      boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                    }}
                    onMouseDown={e => { if (cart.length && drawer) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>💳</span>
                    <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lang === 'ku' ? 'کارت' : 'Card'}
                    </span>
                  </button>

                  {/* Split */}
                  <button
                    id="pos-split-payment-btn"
                    onClick={() => setCheckoutView('split')}
                    disabled={!cart.length || !drawer}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      height: '32px',
                      background: 'linear-gradient(160deg, #A78BFA, #8B5CF6)',
                      border: 'none', borderRadius: '8px', color: '#fff',
                      cursor: (!cart.length || !drawer) ? 'not-allowed' : 'pointer',
                      opacity: (!cart.length || !drawer) ? 0.4 : 1,
                      transition: 'transform 0.1s, opacity 0.15s',
                      boxShadow: '0 2px 6px rgba(109,40,217,0.3)',
                    }}
                    onMouseDown={e => { if (cart.length && drawer) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>⚖️</span>
                    <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lang === 'ku' ? 'دووبەش' : 'Split'}
                    </span>
                  </button>
                </div>

                {/* SECONDARY ROW: compact toolbar buttons (Exact Cash, Recall, Park, Void, Drawer) */}
                <div style={{ display: 'flex', gap: 4 }}>

                  {/* Exact Cash [F2] */}
                  <button
                    onClick={() => { if (cart.length && drawer) { void triggerCheckout(true); } }}
                    disabled={!cart.length || !drawer}
                    title="Exact Cash (F2)"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                      height: '26px',
                      background: '#EEF8F0', border: '1px solid #D1FAE5',
                      borderRadius: '6px', color: '#15803D',
                      cursor: (!cart.length || !drawer) ? 'not-allowed' : 'pointer',
                      opacity: (!cart.length || !drawer) ? 0.4 : 1,
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: '10px', lineHeight: 1 }}>⚡</span>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: '#15803D', whiteSpace: 'nowrap' }}>
                      {lang === 'ku' ? 'نەخت تەواو' : 'Exact'}
                    </span>
                  </button>

                  {/* Recall Parked */}
                  <button
                    onClick={() => { void loadHoldsCount(); setActiveModal('holds'); }}
                    title="Recall Parked"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                      height: '26px',
                      background: holdsCount > 0 ? '#FEF3C7' : '#FFFFFF',
                      border: holdsCount > 0 ? '1px solid #FDE68A' : '1px solid #E5E7EB',
                      borderRadius: '6px',
                      color: holdsCount > 0 ? '#B45309' : '#6B7280',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      position: 'relative',
                    }}
                  >
                    {holdsCount > 0 && (
                      <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '7px', background: '#F59E0B', color: '#fff', borderRadius: '6px', padding: '0px 3px', fontWeight: 800, fontFamily: 'monospace' }}>{holdsCount}</span>
                    )}
                    <span style={{ fontSize: '10px', lineHeight: 1 }}>📥</span>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'inherit', whiteSpace: 'nowrap' }}>
                      {lang === 'ku' ? 'هێنانەوە' : 'Recall'}
                    </span>
                  </button>

                  {/* Park Basket [F5] */}
                  <button
                    onClick={() => void saveHold()}
                    disabled={!cart.length}
                    title="Park Basket (F5)"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                      height: '26px',
                      background: '#FFFFFF', border: '1px solid #E5E7EB',
                      borderRadius: '6px', color: '#475569',
                      cursor: !cart.length ? 'not-allowed' : 'pointer',
                      opacity: !cart.length ? 0.4 : 1,
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: '10px', lineHeight: 1 }}>📂</span>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'inherit', whiteSpace: 'nowrap' }}>
                      {lang === 'ku' ? 'ڕاگرتن' : 'Park'}
                    </span>
                  </button>

                  {/* Void Sale [F8] */}
                  <button
                    onClick={handleVoidTransaction}
                    disabled={!cart.length}
                    title="Void Sale (F8)"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                      height: '26px',
                      background: '#FEF2F2', border: '1px solid #FCA5A5',
                      borderRadius: '6px', color: '#DC2626',
                      cursor: !cart.length ? 'not-allowed' : 'pointer',
                      opacity: !cart.length ? 0.4 : 1,
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: '10px', lineHeight: 1 }}>🚫</span>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'inherit', whiteSpace: 'nowrap' }}>
                      {lang === 'ku' ? 'پوچەڵکردن' : 'Void'}
                    </span>
                  </button>

                  {/* Open Cash Drawer */}
                  {drawer && (
                    <button
                      id="pos-manual-drawer-pop-btn"
                      onClick={() => handleManualDrawerPop('Manual open by cashier')}
                      title="Open Cash Drawer"
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                        height: '26px',
                        background: '#F0FDF4', border: '1px solid #86EFAC',
                        borderRadius: '6px', color: '#15803D',
                        cursor: 'pointer',
                        transition: 'background 0.1s, transform 0.08s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      <span style={{ fontSize: '10px', lineHeight: 1 }}>🗃️</span>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: '#15803D' }}>
                        {lang === 'ku' ? 'سندوق' : 'Drawer'}
                      </span>
                    </button>
                  )}

                </div>

              </div>
            </div>

            {/* ── Inline Cash Panel ── */}
            {checkoutView === 'cash' && (
              <div style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
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
              <div style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
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
              <div style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
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
              <div style={{ margin: '0 8px 5px', borderRadius: '6px', border: '1px solid #BBF7D0', background: '#ECFDF5', padding: '5px 10px' }}>
                <p style={{ fontSize: '10px', color: '#16A34A', fontWeight: 800, margin: 0 }}>✓ {t.transactionComplete}: R-{sale.receiptNumber}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                  <a style={{ fontSize: '10px', color: '#2563EB', fontWeight: 700, textDecoration: 'underline' }} href={apiUrl(`/sales/${sale.id}/receipt.pdf`)} target="_blank" rel="noreferrer">📄 {t.downloadReceipt}</a>
                  <button style={{ fontSize: '10px', color: '#2563EB', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { if (sale) { const html = buildReceiptHtml(sale, lang, translations[lang]); printSaleReceipt(html); showNotification(`🖨️ ${t.reprintingCopy}`, 'info'); } }}>🖨️ {t.reprintReceipt}</button>
                </div>
              </div>
            )}

          </div>
        </div>
        {/* ─── END CHECKOUT PANEL ─── */}

        {/* ─────────── PRODUCT + CATEGORY PANEL (~42%) ─────────── */}
        <div style={{ flex: '42 0 0', minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

          {/* Search / Barcode bar */}
          <form onSubmit={handleBarcodeSubmit} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', borderBottom: '1px solid #E5E7EB', background: '#F5FBF6', height: 36 }}>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#16A34A', padding: '0 8px', flexShrink: 0, letterSpacing: '1px', fontWeight: 700 }}>[F1]</span>
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              style={{ flex: 1, height: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#111827', fontSize: '11px', fontFamily: 'monospace', padding: '0 6px', letterSpacing: '0.3px' }}
              placeholder={isRtl ? 'گەڕان / بارکۆد...' : 'Scan barcode or search...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              dir={isRtl ? 'rtl' : 'ltr'}
            />
            <span className="flex h-2 w-2 mr-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#16A34A' }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#16A34A' }}></span>
            </span>
          </form>

          {/* Product Grid + Category Sidebar */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Product Grid */}
            <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent', background: '#F5FBF6' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontSize: '24px', opacity: 0.3 }}>🔍</span>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                    {isRtl ? 'هیچ بەرهەمێک نەدۆزرایەوە' : 'No products found'}
                  </p>
                </div>
              ) : (
                <div className="pos-product-grid">
                  {filteredProducts.map((p) => {
                    const style = categoryStyles[p.category.slug] || defaultCategoryStyle;
                    const localizedName = productTranslations[p.sku]?.[lang] || p.name;
                    const cartItem = cart.find((item) => item.product.id === p.id);
                    const qtyInCart = cartItem ? cartItem.quantity : 0;
                    const outOfStock = p.stockQuantity <= 0;
                    const unitLabel = p.unit === 'KG' ? 'kg' : p.unit === 'LITER' ? 'L' : '';

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        disabled={outOfStock}
                        title={`${localizedName} — ${formatCurrency(Number(p.price))}${unitLabel ? `/${unitLabel}` : ''}`}
                        className={`pos-product-tile ${qtyInCart > 0 ? 'pos-product-tile--selected' : ''} ${outOfStock ? 'pos-product-tile--out' : ''}`}
                      >
                        {p.imageUrl ? (
                          <img src={apiUrl(p.imageUrl)} alt={localizedName} className="pos-product-tile__img" />
                        ) : (
                          <div className="pos-product-tile__fallback" aria-hidden="true">
                            {style.emoji}
                          </div>
                        )}

                        <div className="pos-product-tile__info">
                          <span className="pos-product-tile__name">{localizedName}</span>
                          <div className="pos-product-tile__price-row">
                            <span className="pos-product-tile__price">{formatCurrency(Number(p.price))}</span>
                            {unitLabel && <span className="pos-product-tile__unit">/{unitLabel}</span>}
                          </div>
                        </div>

                        {qtyInCart > 0 ? (
                          <span className="pos-product-tile__qty">
                            {p.unit === 'KG' || p.unit === 'LITER' ? qtyInCart.toFixed(1) : `${qtyInCart}×`}
                          </span>
                        ) : null}

                        {outOfStock ? <div className="pos-product-tile__out" aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Category Sidebar (far right, text-only) ── */}
            <div style={{ width: '80px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFFFFF', borderLeft: '1px solid #E5E7EB' }}>
              <div style={{ padding: '3px 4px', textAlign: 'center', background: '#F5FBF6', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
                <span style={{ fontSize: '7px', fontWeight: 900, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px' }}>FILTER</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: '3px', scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB #F3F4F6' }}>
                {/* ALL button */}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`pos-cat-btn${selectedCategory === 'all' ? ' pos-cat-btn--active' : ''}`}
                >
                  {lang === 'ku' ? 'هەموو' : 'All Items'}
                </button>

                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const localizedCatName = categoryTranslations[cat.slug]?.[lang] || cat.name;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      title={localizedCatName}
                      className={`pos-cat-btn${isSelected ? ' pos-cat-btn--active' : ''}`}
                    >
                      {localizedCatName}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
        {/* ─── END PRODUCT + CATEGORY PANEL ─── */}

      </section>

      {/* ── FOOTER BAR ── */}
      <footer className="flex items-center justify-between rounded-lg px-3 flex-shrink-0" style={{ height: '30px', background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 -1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex gap-1.5 items-center">
          {/* Apply Coupon */}
          <button
            onClick={() => { setAppliedCoupon(null); setCouponCode(''); setActiveModal('coupon'); }}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold transition-colors hover:opacity-80"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', height: '22px' }}
          >
            🎟️ {t.applyCoupon}
          </button>

          {/* Refund Lookup */}
          <button
            onClick={() => setActiveModal('refund')}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold transition-colors hover:opacity-80"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', height: '22px' }}
          >
            🔄 {t.refundLookup}
          </button>

          {/* Cash Till Session */}
          <button
            onClick={() => { setDrawerFloatInput('100000'); setActiveModal('drawer'); }}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold transition-colors hover:opacity-80"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', height: '22px' }}
          >
            🪙 {t.cashTillSession}
          </button>

          {/* Z-Report */}
          <button
            onClick={handleShowZReport}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold transition-colors hover:opacity-80"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', height: '22px' }}
          >
            📊 {t.shiftZReport}
          </button>
        </div>

        <div>
          <button
            onClick={() => { void loadHoldsCount(); setActiveModal('holds'); }}
            className={`rounded px-2 py-0.5 text-[9px] font-bold transition-all ${holdsCount > 0 ? 'animate-pulse' : ''}`}
            style={holdsCount > 0
              ? { background: '#FFFBEB', border: '1px solid #FDE68A', color: '#D97706', height: '22px' }
              : { background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', height: '22px' }}
          >
            📥 {t.recallHolds} ({holdsCount})
          </button>
        </div>
      </footer>



      {/* Dynamic premium toast overlay */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 transform rounded-xl px-6 py-3 transition-all" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm">
              {toast.type === 'success' ? '🟢' : toast.type === 'error' ? '🔴' : '💡'}
            </span>
            <p className="text-xs font-extrabold tracking-tight" style={{ color: '#111827' }}>{toast.message}</p>
          </div>
        </div>
      )}

      {/* MODAL: PIN VERIFICATION CODE */}
      {activeModal === 'pin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-[360px] rounded-2xl p-6 shadow-2xl" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#DC2626' }}>
              🚨 {t.pinRequired}
            </h3>
            <p className="text-[10px] mb-4" style={{ color: '#6B7280' }}>{pinCallback?.label}</p>

            {pinError && (
              <div className="mb-4 rounded-lg p-2.5 text-xs font-bold" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                {pinError}
              </div>
            )}

            <input
              type="password"
              placeholder="••••"
              maxLength={6}
              className="w-full text-center rounded-xl px-4 py-3 text-xl font-mono focus:outline-none"
              style={{ border: '1.5px solid #E5E7EB', background: '#F8FAFC', color: '#111827' }}
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleVerifyPIN();
              }}
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={closeModals}
                className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
                style={{ border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#374151' }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleVerifyPIN}
                className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white"
                style={{ background: '#DC2626' }}
              >
                {t.verify}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AGE CONFIRMATION VERIFY */}
      {activeModal === 'age' && ageProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-[380px] rounded-2xl p-6 shadow-2xl text-center" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <span className="text-4xl">🔞</span>
            <h3 className="text-base font-bold uppercase tracking-wider mt-2 mb-2" style={{ color: '#DC2626' }}>
              {t.ageVerification}
            </h3>
            <p className="text-xs px-2 leading-relaxed" style={{ color: '#374151' }}>
              {t.ageRestrictionText} <strong className="text-sm font-black" style={{ color: '#111827' }}>{ageProduct.minAge}</strong>.
            </p>
            <p className="text-[10px] mt-2 font-mono" style={{ color: '#6B7280' }}>{ageProduct.name}</p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={closeModals}
                className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
                style={{ border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#374151' }}
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmAgeVerification}
                className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white"
                style={{ background: '#2563EB' }}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WEIGHT TILL SCALE CALIBRATION */}
      {activeModal === 'weight' && scaleProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-[380px] rounded-2xl p-6 shadow-2xl" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <h3 className="text-base font-bold uppercase tracking-wider mb-1" style={{ color: '#D97706' }}>
              ⚖️ {t.weightVerification}
            </h3>
            <p className="text-[10px] mb-4" style={{ color: '#6B7280' }}>{scaleProduct.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] mb-1" style={{ color: '#6B7280' }}>{t.scaleWeight}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
                    style={{ border: '1.5px solid #E5E7EB', background: '#F8FAFC', color: '#111827' }}
                    value={scaleWeight}
                    onChange={(e) => setScaleWeight(e.target.value)}
                  />
                  <button
                    onClick={handleSimulateScale}
                    className="rounded-xl px-3 text-xs font-bold hover:opacity-80"
                    style={{ border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#374151' }}
                  >
                    🔄 {t.simulateScale}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={closeModals}
                className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
                style={{ border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#374151' }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleWeightConfirm}
                className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white"
                style={{ background: '#16A34A' }}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISCOUNT COUPONS */}
      {activeModal === 'coupon' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-[380px] rounded-2xl p-6 shadow-2xl" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <h3 className="text-base font-bold uppercase tracking-wider mb-4" style={{ color: '#D97706' }}>
              🎟️ {t.applyCoupon}
            </h3>

            <div className="space-y-3">
              <input
                type="text"
                placeholder={t.couponPlaceholder}
                className="w-full rounded-xl px-4 py-2.5 text-sm uppercase focus:outline-none"
                style={{ border: '1.5px solid #E5E7EB', background: '#F8FAFC', color: '#111827' }}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />

              <div className="flex gap-2">
                <button
                  onClick={closeModals}
                  className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
                  style={{ border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#374151' }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleApplyCoupon}
                  className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white"
                  style={{ background: '#F59E0B' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-[500px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 shadow-2xl" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <h3 className="text-base font-bold uppercase tracking-wider mb-4" style={{ color: '#D97706' }}>
              🔄 {t.refundReceipt}
            </h3>

            {refundSuccessPdf ? (
              <div className="rounded-xl p-4 text-center" style={{ background: '#ECFDF5', border: '1px solid #BBF7D0' }}>
                <p className="text-sm font-bold mb-2" style={{ color: '#16A34A' }}>{t.refundApproved}</p>
                <a
                  href={refundSuccessPdf}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg px-4 py-2 text-xs font-bold inline-block text-white"
                  style={{ background: '#2563EB' }}
                >
                  🖨️ {t.reprintReceipt}
                </a>
                <button
                  onClick={closeModals}
                  className="block mt-4 text-xs font-semibold hover:underline mx-auto"
                  style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t.close}
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1.5px solid #E5E7EB', background: '#F8FAFC', color: '#111827' }}
                    placeholder="R-1..."
                    value={refundReceipt}
                    onChange={(e) => setRefundReceipt(e.target.value)}
                  />
                  <button
                    onClick={handleLookupReceipt}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-white"
                    style={{ background: '#D97706' }}
                  >
                    {t.find}
                  </button>
                </div>

                {refundSale && (
                  <div className="space-y-4">
                    <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                      <p style={{ color: '#111827' }}><span style={{ color: '#6B7280' }}>{t.date}:</span> {formatDate(refundSale.createdAt)}</p>
                      <p style={{ color: '#111827' }}><span style={{ color: '#6B7280' }}>{t.cashier}:</span> {refundSale.user.name}</p>
                      <p style={{ color: '#111827' }}><span style={{ color: '#6B7280' }}>{t.total}:</span> {formatCurrency(Number(refundSale.total))}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#111827' }}>{t.allItems}</p>
                      {refundSale.items.map((item: any) => {
                        const maxQty = item.quantity;
                        const currQty = refundQuantities[item.productId] ?? 0;
                        const localizedItemName = productTranslations[item.product.sku]?.[lang] || item.productName;

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2.5 rounded-lg p-2.5 text-xs"
                            style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}
                          >
                            <span className="flex-1 truncate" style={{ color: '#111827' }}>{localizedItemName}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={maxQty}
                                className="w-14 text-center rounded p-1 font-mono focus:outline-none"
                                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                                value={currQty}
                                onChange={(e) =>
                                  handleItemRefundQtyChange(item.productId, Number(e.target.value), maxQty)
                                }
                              />
                              <span className="font-mono" style={{ color: '#6B7280' }}>/ {maxQty}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>{t.reason}</label>
                      <input
                        type="text"
                        className="w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                        style={{ border: '1.5px solid #E5E7EB', background: '#F8FAFC', color: '#111827' }}
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={closeModals}
                        className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
                        style={{ border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#374151' }}
                      >
                        {t.cancel}
                      </button>
                      <button
                        onClick={handleProcessRefundSubmit}
                        className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white"
                        style={{ background: '#D97706' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-[450px] rounded-2xl p-6 shadow-2xl" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#D97706' }}>
                🪙 {t.cashTillSession}
              </h3>
              <button onClick={closeModals} style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            {drawerLoading ? (
              <p className="text-center text-xs py-8" style={{ color: '#6B7280' }}>Loading drawer session...</p>
            ) : !drawer ? (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>
                  {t.openingFloatRequired}
                </p>

                <div>
                  <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>{t.openingFloat}</label>
                  <input
                    type="number"
                    step="1"
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
                    style={{ border: '1.5px solid #E5E7EB', background: '#F8FAFC', color: '#111827' }}
                    value={drawerFloatInput}
                    onChange={(e) => setDrawerFloatInput(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleOpenDrawer}
                  className="w-full rounded-xl py-2.5 text-xs font-bold text-white"
                  style={{ background: '#16A34A' }}
                >
                  🚀 {t.openSession}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl p-4 space-y-2 text-xs font-mono" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                  <div className="flex justify-between">
                    <span style={{ color: '#6B7280' }}>{t.activeSession}:</span>
                    <span style={{ color: '#16A34A', fontWeight: 700 }}>#{drawer.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#6B7280' }}>{t.openingFloat}:</span>
                    <span style={{ color: '#111827' }}>{formatCurrency(Number(drawer.openingFloat))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#6B7280' }}>{t.date}:</span>
                    <span style={{ color: '#111827' }}>{formatDate(drawer.openedAt)}</span>
                  </div>
                </div>

                {/* Cash in / out movement loggers */}
                <div className="rounded-xl p-4 space-y-3" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#111827' }}>Log Till Adjustment</p>
                  <div>
                    <label className="block text-[10px] mb-1" style={{ color: '#6B7280' }}>{t.amount}</label>
                    <input
                      type="number"
                      step="1"
                      className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                      style={{ border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#111827' }}
                      value={cashMovementAmount}
                      onChange={(e) => setCashMovementAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1" style={{ color: '#6B7280' }}>{t.reason}</label>
                    <input
                      type="text"
                      className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none"
                      style={{ border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#111827' }}
                      value={cashMovementReason}
                      onChange={(e) => setCashMovementReason(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCashMovement('CASH_IN')}
                      className="flex-1 rounded font-bold py-1.5 text-[10px] hover:opacity-80"
                      style={{ background: '#ECFDF5', border: '1px solid #BBF7D0', color: '#16A34A' }}
                    >
                      📥 {t.cashIn}
                    </button>
                    <button
                      onClick={() => handleCashMovement('CASH_OUT')}
                      className="flex-1 rounded font-bold py-1.5 text-[10px] hover:opacity-80"
                      style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                    >
                      📤 {t.cashOut}
                    </button>
                  </div>
                </div>

                {/* Close Session Shift Input */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
                  <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>{t.closingFloat}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="1"
                      className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
                      style={{ border: '1.5px solid #E5E7EB', background: '#F8FAFC', color: '#111827' }}
                      value={drawerFloatInput}
                      onChange={(e) => setDrawerFloatInput(e.target.value)}
                    />
                    <button
                      onClick={handleCloseDrawer}
                      className="rounded-xl px-4 text-xs font-bold text-white hover:opacity-80 transition-colors"
                      style={{ background: '#DC2626' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-[450px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 shadow-2xl" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold uppercase tracking-wider" style={{ color: '#D97706' }}>{t.zReport}</h3>
              <p className="text-xs" style={{ color: '#6B7280' }}>{t.zReportDescription}</p>
            </div>

            <div className="rounded-xl p-4 space-y-2 text-xs font-mono" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
              <div className="flex justify-between pb-1" style={{ borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: '#6B7280' }}>Session Start:</span>
                <span style={{ color: '#111827' }}>{formatDate(zReportData.sessionStart)}</span>
              </div>
              <div className="flex justify-between pb-1" style={{ borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: '#6B7280' }}>Session End:</span>
                <span style={{ color: '#111827' }}>{formatDate(zReportData.sessionEnd)}</span>
              </div>
              <div className="flex justify-between pb-1" style={{ borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: '#6B7280' }}>{t.cashier}:</span>
                <span style={{ color: '#111827', fontWeight: 700 }}>{zReportData.cashier}</span>
              </div>

              <div style={{ height: 1, background: '#E5E7EB', margin: '8px 0' }} />

              <div className="flex justify-between">
                <span style={{ color: '#6B7280' }}>{t.floatStart}:</span>
                <span style={{ color: '#111827' }}>{formatCurrency(zReportData.openingFloat)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6B7280' }}>{t.cashPayments}:</span>
                <span style={{ color: '#16A34A' }}>{formatCurrency(zReportData.cashSales)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6B7280' }}>{t.cardPayments}:</span>
                <span style={{ color: '#2563EB' }}>{formatCurrency(zReportData.cardSales)}</span>
              </div>
              <div className="flex justify-between" style={{ color: '#DC2626' }}>
                <span>Total Voids ({zReportData.voidsCount}):</span>
                <span>-{formatCurrency(zReportData.totalVoids)}</span>
              </div>
              <div className="flex justify-between" style={{ color: '#DC2626' }}>
                <span>Total Refunds ({zReportData.refundsCount}):</span>
                <span>-{formatCurrency(zReportData.totalRefunds)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6B7280' }}>{t.cashIn}:</span>
                <span style={{ color: '#16A34A' }}>+{formatCurrency(zReportData.cashIn)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6B7280' }}>{t.cashOut}:</span>
                <span style={{ color: '#DC2626' }}>-{formatCurrency(zReportData.cashOut)}</span>
              </div>

              <div style={{ height: 1, background: '#E5E7EB', margin: '8px 0' }} />

              <div className="flex justify-between font-bold" style={{ color: '#111827' }}>
                <span>{t.expectedDrawerCash}:</span>
                <span>{formatCurrency(zReportData.expectedCash)}</span>
              </div>
              {zReportData.closingFloat !== undefined && (
                <>
                  <div className="flex justify-between font-bold" style={{ color: '#111827' }}>
                    <span>{t.countedDrawerCash}:</span>
                    <span>{formatCurrency(zReportData.closingFloat)}</span>
                  </div>
                  <div
                    className="flex justify-between font-bold pt-1.5"
                    style={{ borderTop: '1px solid #E5E7EB', color: Number(zReportData.difference) >= 0 ? '#16A34A' : '#DC2626' }}
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
                onClick={() => { window.print(); }}
                className="flex-1 rounded-xl py-2.5 text-xs font-bold hover:opacity-80 transition-colors"
                style={{ border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#374151' }}
              >
                🖨️ {t.printAuditor}
              </button>
              <button
                onClick={closeModals}
                className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white hover:opacity-80 transition-colors"
                style={{ background: '#2563EB' }}
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECALL PARKED DIALOG */}
      {activeModal === 'holds' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-[500px] max-h-[80vh] overflow-y-auto rounded-2xl p-5 shadow-2xl" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#D97706' }}>
                📥 {t.recallHolds}
              </h3>
              <button onClick={closeModals} style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            {holds.length === 0 ? (
              <p className="text-center text-xs py-8" style={{ color: '#6B7280' }}>{t.noParkedBaskets}</p>
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
                      className={`w-full rounded-xl p-4 ${isRtl ? 'text-right' : 'text-left'} transition hover:opacity-80`}
                      style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold" style={{ color: '#111827' }}>{t.basketId}: #{hold.id.slice(0, 8)}</p>
                          <p className="text-[10px]" style={{ color: '#6B7280' }}>{t.cashier}: {hold.cashier?.name}</p>
                          <p className="text-[10px]" style={{ color: '#6B7280' }}>{t.itemsCountLabel}: {itemCount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px]" style={{ color: '#6B7280' }}>{formatDate(hold.updatedAt)}</p>
                          <span className="mt-1 inline-block rounded px-2.5 py-1 text-[10px] font-bold" style={{ background: '#EFF6FF', color: '#2563EB' }}>
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
