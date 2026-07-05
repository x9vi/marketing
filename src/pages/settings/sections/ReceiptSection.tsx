import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Field } from '../components/Field.js';
import { Select } from '../components/Select.js';
import { Toggle } from '../components/Toggle.js';

export function ReceiptSection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const receipt = settings.receipt;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <SectionCard title="Receipt Layout" description="Configure the paper size and layout elements.">
          <div className="mb-6">
            <Select
              label="Paper Width"
              value={receipt.receiptWidth}
              onChange={(e) => update('receipt', { ...receipt, receiptWidth: e.target.value as '80mm' | '58mm' })}
              options={[
                { value: '80mm', label: '80mm (Standard)' },
                { value: '58mm', label: '58mm (Narrow)' },
              ]}
            />
          </div>
          
          <div className="grid gap-4">
            <Toggle label="Print Store Logo" checked={receipt.printLogo} onChange={(val) => update('receipt', { ...receipt, printLogo: val })} />
            <Toggle label="Print Store Information" checked={receipt.printStoreInfo} onChange={(val) => update('receipt', { ...receipt, printStoreInfo: val })} />
            <Toggle label="Print Cashier Name" checked={receipt.printCashierName} onChange={(val) => update('receipt', { ...receipt, printCashierName: val })} />
            <Toggle label="Print Date & Time" checked={receipt.printDateTime} onChange={(val) => update('receipt', { ...receipt, printDateTime: val })} />
            <Toggle label="Print Item Barcodes" checked={receipt.printBarcode} onChange={(val) => update('receipt', { ...receipt, printBarcode: val })} />
            <Toggle label="Print Tax Summary" checked={receipt.printTaxSummary} onChange={(val) => update('receipt', { ...receipt, printTaxSummary: val })} />
            <Toggle label="Print Change Due" checked={receipt.printChange} onChange={(val) => update('receipt', { ...receipt, printChange: val })} />
          </div>
        </SectionCard>

        <SectionCard title="Receipt Text" description="Custom messages to print on every receipt.">
          <div className="grid gap-6">
            <Field label="Header Message" placeholder="e.g. Welcome to FreshMart!" value={receipt.header} onChange={(e) => update('receipt', { ...receipt, header: e.target.value })} />
            <Field label="Footer Message" placeholder="e.g. Thank you for your business!" value={receipt.footer} onChange={(e) => update('receipt', { ...receipt, footer: e.target.value })} />
            <Field label="Number of Copies" type="number" min="1" max="5" value={String(receipt.receiptCopies)} onChange={(e) => update('receipt', { ...receipt, receiptCopies: parseInt(e.target.value, 10) || 1 })} />
          </div>
        </SectionCard>
      </div>

      <div>
        <SectionCard title="Live Preview" description="How your receipt will look when printed.">
          <div className="mx-auto flex justify-center border-t border-slate-100 bg-slate-50 pt-8 pb-12">
            <div className={`bg-white shadow-md font-mono text-sm px-6 py-8 ${receipt.receiptWidth === '80mm' ? 'w-80' : 'w-56'} relative`}>
              {/* Receipt top zig-zag edge */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgogIDxwb2x5Z29uIHBvaW50cz0iMCwwIDQsOCA4LDAiIGZpbGw9IiNmOGZhZmMiLz4KPC9zdmc+')] bg-repeat-x rotate-180 transform translate-y-[-100%]"></div>
              
              {receipt.printLogo && settings.store.logoUrl && (
                <div className="mb-4 flex justify-center">
                  <img src={settings.store.logoUrl} alt="Logo" className="h-12 object-contain grayscale" />
                </div>
              )}
              
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold uppercase">{settings.store.name}</h2>
                {receipt.printStoreInfo && (
                  <div className="text-xs mt-1 text-gray-600">
                    {settings.store.address && <div>{settings.store.address}</div>}
                    {settings.store.phone && <div>Tel: {settings.store.phone}</div>}
                    {settings.store.taxNumber && <div>Tax ID: {settings.store.taxNumber}</div>}
                  </div>
                )}
              </div>

              {receipt.header && (
                <div className="mb-4 text-center text-xs whitespace-pre-wrap">{receipt.header}</div>
              )}

              <div className="text-xs mb-4 grid gap-1 border-b border-dashed border-gray-300 pb-4">
                {receipt.printDateTime && <div>Date: 10/24/2026 14:30</div>}
                <div>Receipt #: RC-12345</div>
                {receipt.printCashierName && <div>Cashier: Admin</div>}
              </div>

              <div className="text-xs mb-4">
                <div className="flex justify-between font-bold mb-1 border-b border-gray-200 pb-1">
                  <span>Item</span>
                  <span>Total</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Apple Gala (x2)</span>
                  <span>$4.00</span>
                </div>
                {receipt.printBarcode && <div className="text-[10px] text-gray-500 mb-2">*123456789*</div>}
                
                <div className="flex justify-between mb-1">
                  <span>Whole Milk</span>
                  <span>$3.50</span>
                </div>
                {receipt.printBarcode && <div className="text-[10px] text-gray-500 mb-2">*987654321*</div>}
              </div>

              <div className="border-t border-dashed border-gray-300 pt-4 text-xs">
                <div className="flex justify-between mb-1">
                  <span>Subtotal</span>
                  <span>$7.50</span>
                </div>
                {receipt.printTaxSummary && (
                  <div className="flex justify-between mb-1">
                    <span>Tax (5%)</span>
                    <span>$0.38</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-2 mb-4">
                  <span>TOTAL</span>
                  <span>$7.88</span>
                </div>
                <div className="flex justify-between mb-1 text-gray-600">
                  <span>Cash</span>
                  <span>$10.00</span>
                </div>
                {receipt.printChange && (
                  <div className="flex justify-between mb-1 text-gray-600">
                    <span>Change</span>
                    <span>$2.12</span>
                  </div>
                )}
              </div>

              {receipt.footer && (
                <div className="mt-8 text-center text-xs whitespace-pre-wrap">{receipt.footer}</div>
              )}
              
              {/* Receipt bottom zig-zag edge */}
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgogIDxwb2x5Z29uIHBvaW50cz0iMCwwIDQsOCA4LDAiIGZpbGw9IiNmOGZhZmMiLz4KPC9zdmc+')] bg-repeat-x transform translate-y-full"></div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
