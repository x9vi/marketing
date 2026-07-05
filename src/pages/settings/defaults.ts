import type { AppSettings } from './types.js';

export const defaultSettings: AppSettings = {
  store: {
    name: 'FreshMart',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
    currency: 'USD',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h'
  },
  pos: {
    defaultPaymentMethod: 'CASH',
    autoCashDrawer: true,
    autoPrintReceipt: true,
    confirmBeforeCompleteSale: false,
    enableBarcodeScanner: true,
    enableKeyboardShortcuts: true,
    barcodeScanSound: true,
    enableDiscounts: true,
    enableReturns: true,
    enableRefunds: true,
    allowManualPriceChanges: true,
    allowManualQuantityChanges: true,
    roundingOption: 'none'
  },
  receipt: {
    receiptWidth: '80mm',
    printLogo: true,
    printStoreInfo: true,
    printCashierName: true,
    printDateTime: true,
    printBarcode: true,
    printQrCode: false,
    printTaxSummary: true,
    printChange: true,
    header: 'Thank you for shopping with us',
    footer: 'Please come again',
    receiptCopies: 1
  },
  hardware: {
    receiptPrinter: '',
    cashDrawer: '',
    barcodeScanner: '',
    customerDisplay: '',
    electronicScale: ''
  },
  taxes: {
    inclusivePricing: false,
    defaultRate: 0,
    currencySymbol: '$',
    currencyPosition: 'left',
    decimalPlaces: 2,
    roundTotals: false
  },
  inventory: {
    lowStockAlert: true,
    lowStockThreshold: 10,
    allowNegativeStock: false,
    autoGenerateSku: true,
    expiryWarningDays: 30,
    batchTracking: false
  },
  backup: {
    automaticBackup: false,
    backupLocation: '',
    lastBackupDate: ''
  },
  notifications: {
    lowStockAlerts: true,
    expiringProductAlerts: true,
    printerErrorNotifications: true,
    backupReminder: true,
    failedLoginAlerts: true
  },
  appearance: {
    theme: 'light',
    accentColor: 'mint',
    fontSize: 'medium',
    compactMode: false
  },
  security: {
    autoLogout: false,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    pinLogin: false,
    rememberMeDays: 7
  }
};
