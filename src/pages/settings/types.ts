export type AppSettings = {
  store: {
    name: string;
    logoUrl: string;
    address: string;
    phone: string;
    email: string;
    taxNumber: string;
    currency: string;
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  pos: {
    defaultPaymentMethod: 'CASH' | 'CARD';
    autoCashDrawer: boolean;
    autoPrintReceipt: boolean;
    confirmBeforeCompleteSale: boolean;
    enableBarcodeScanner: boolean;
    enableKeyboardShortcuts: boolean;
    barcodeScanSound: boolean;
    enableDiscounts: boolean;
    enableReturns: boolean;
    enableRefunds: boolean;
    allowManualPriceChanges: boolean;
    allowManualQuantityChanges: boolean;
    roundingOption: 'none' | 'nearest_05' | 'nearest_10' | 'up' | 'down';
  };
  receipt: {
    receiptWidth: '80mm' | '58mm';
    printLogo: boolean;
    printStoreInfo: boolean;
    printCashierName: boolean;
    printDateTime: boolean;
    printBarcode: boolean;
    printQrCode: boolean;
    printTaxSummary: boolean;
    printChange: boolean;
    header: string;
    footer: string;
    receiptCopies: number;
  };
  hardware: {
    receiptPrinter: string;
    cashDrawer: string;
    barcodeScanner: string;
    customerDisplay: string;
    electronicScale: string;
  };
  taxes: {
    inclusivePricing: boolean;
    defaultRate: number;
    currencySymbol: string;
    currencyPosition: 'left' | 'right';
    decimalPlaces: number;
    roundTotals: boolean;
  };
  inventory: {
    lowStockAlert: boolean;
    lowStockThreshold: number;
    allowNegativeStock: boolean;
    autoGenerateSku: boolean;
    expiryWarningDays: number;
    batchTracking: boolean;
  };
  backup: {
    automaticBackup: boolean;
    backupLocation: string;
    lastBackupDate: string;
  };
  notifications: {
    lowStockAlerts: boolean;
    expiringProductAlerts: boolean;
    printerErrorNotifications: boolean;
    backupReminder: boolean;
    failedLoginAlerts: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
  };
  security: {
    autoLogout: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    pinLogin: boolean;
    rememberMeDays: number;
  };
};

export type DatabaseInfo = {
  name: string;
  location: string;
  sizeBytes: number;
  products: number;
  sales: number;
  customers: number;
  suppliers: number;
  transactions: number;
};
