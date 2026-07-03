/**
 * InlineSplitPanel — Professional POS inline split payment panel
 * Allows specifying cash + card amounts that together cover the sale total.
 * Lives inside the right checkout panel — no modal.
 */

import { useState, useEffect } from 'react';
import { formatCurrency } from '../lib/format.js';

export interface InlineSplitPanelProps {
  saleTotal: number;
  lang: 'en' | 'ku';
  onConfirm: (cashAmount: number, cardAmount: number) => void;
  onBack: () => void;
}

type CardStep = 'idle' | 'connecting' | 'tap' | 'approving' | 'approved';

const TX = {
  en: {
    splitPayment: 'Split Payment',
    back: '← Back',
    totalDue: 'Total Due',
    cashAmount: 'Cash Amount',
    cardAmount: 'Card Amount',
    allocated: 'Allocated',
    remaining: 'Remaining',
    confirm: 'Confirm Split',
    cancel: 'Cancel',
    overpayWarning: 'Over total — adjust amounts',
    shortWarning: 'Still short — add more',
    perfectMatch: 'Amounts match total ✓',
    quickSplit: 'Quick Split',
    half: '50/50',
    connecting: 'Processing card portion...',
    tapCard: 'TAP CARD FOR REMAINING',
    approving: 'Authorizing...',
    approved: 'Approved ✓',
    setMax: 'Set Max Cash',
  },
  ku: {
    splitPayment: 'پارەدانی بەشەکراو',
    back: '← گەڕانەوە',
    totalDue: 'کۆی گشتی شایستە',
    cashAmount: 'بڕی نەختی',
    cardAmount: 'بڕی کارت',
    allocated: 'دابەشکراو',
    remaining: 'ماوە',
    confirm: 'پەسەندکردنی دابەشکردن',
    cancel: 'پاشگەزبوونەوە',
    overpayWarning: 'زیاترە — بڕەکان ڕاستبکەرەوە',
    shortWarning: 'کەمترە — زیادی بکە',
    perfectMatch: 'بڕەکان لەگەڵ کۆیەکە دەگونجێن ✓',
    quickSplit: 'دابەشکردنی خێرا',
    half: '٥٠/٥٠',
    connecting: 'پرۆسەکردنی بەشی کارت...',
    tapCard: 'کارتەکە لێبدە بۆ ماوەکە',
    approving: 'لە پرۆسەی پەسەندکردندایە...',
    approved: 'پەسەندکرا ✓',
    setMax: 'زۆرترین نەختی',
  },
} as const;

export function InlineSplitPanel({ saleTotal, lang, onConfirm, onBack }: InlineSplitPanelProps) {
  const t = TX[lang];
  const [cashInput, setCashInput] = useState('');
  const [cardInput, setCardInput] = useState('');
  const [cardStep, setCardStep] = useState<CardStep>('idle');

  const cashAmt = Math.max(0, Number(cashInput) || 0);
  const cardAmt = Math.max(0, Number(cardInput) || 0);
  const totalAllocated = cashAmt + cardAmt;
  const diff = totalAllocated - saleTotal;
  const isExact = Math.abs(diff) < 0.01;
  const isShort = diff < -0.01;
  const isOver  = diff > 0.01;

  // Auto-fill card when cash changes
  const handleCashChange = (val: string) => {
    setCashInput(val);
    const c = Math.max(0, Number(val) || 0);
    const remaining = Math.max(0, saleTotal - c);
    setCardInput(remaining > 0 ? String(remaining) : '0');
  };

  const handleCardChange = (val: string) => {
    setCardInput(val);
    const c = Math.max(0, Number(val) || 0);
    const remaining = Math.max(0, saleTotal - c);
    setCashInput(remaining > 0 ? String(remaining) : '0');
  };

  const quickHalf = () => {
    const half = Math.round(saleTotal / 2);
    setCashInput(String(half));
    setCardInput(String(saleTotal - half));
  };

  const setMaxCash = () => {
    setCashInput(String(saleTotal));
    setCardInput('0');
  };

  const handleConfirm = () => {
    if (!isExact || (cashAmt === 0 && cardAmt === 0)) return;
    if (cardAmt > 0) {
      // Simulate card terminal for card portion
      setCardStep('connecting');
      setTimeout(() => {
        setCardStep('tap');
        setTimeout(() => {
          setCardStep('approving');
          setTimeout(() => {
            setCardStep('approved');
            setTimeout(() => {
              onConfirm(cashAmt, cardAmt);
            }, 800);
          }, 1500);
        }, 1800);
      }, 900);
    } else {
      onConfirm(cashAmt, 0);
    }
  };

  useEffect(() => {
    return () => setCardStep('idle');
  }, []);

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        borderTop: '1px solid #E9D5FF',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{
          background: '#F8FAFC',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <button
          onClick={onBack}
          disabled={cardStep !== 'idle'}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black active:scale-95 transition-all disabled:opacity-30"
          style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t.back}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">⚖️</span>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#7C3AED' }}>
            {t.splitPayment}
          </span>
        </div>
        <div className="w-14" />
      </div>

      {/* Split Body */}
      <div
        className="flex flex-col gap-2.5 p-3"
        style={{ background: '#FFFFFF' }}
      >
        {cardStep !== 'idle' ? (
          /* Card terminal simulation */
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl py-8"
            style={{
              background: '#F8FAFC',
              border: cardStep === 'approved'
                ? '1px solid #BBF7D0'
                : '1px solid #E9D5FF',
            }}
          >
            {cardStep === 'connecting' && (
              <>
                <span className="h-8 w-8 rounded-full border-[3px] border-t-transparent" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <p className="text-[11px] font-semibold" style={{ color: '#374151' }}>{t.connecting}</p>
              </>
            )}
            {cardStep === 'tap' && (
              <>
                <span className="text-4xl" style={{ animation: 'bounce 1s ease infinite' }}>💳</span>
                <p className="text-[11px] font-black uppercase tracking-wider text-center px-4" style={{ color: '#111827' }}>{t.tapCard}</p>
                <p className="text-[10px] font-mono" style={{ color: '#7C3AED' }}>{formatCurrency(cardAmt)}</p>
              </>
            )}
            {cardStep === 'approving' && (
              <>
                <span className="h-8 w-8 rounded-full border-[3px] border-t-transparent" style={{ borderColor: '#16A34A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <p className="text-[11px] font-semibold" style={{ color: '#374151' }}>{t.approving}</p>
              </>
            )}
            {cardStep === 'approved' && (
              <>
                <span className="text-4xl" style={{ color: '#16A34A' }}>✓</span>
                <p className="text-[12px] font-black uppercase tracking-widest" style={{ color: '#16A34A' }}>{t.approved}</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Total due display */}
            <div
              className="rounded-xl p-2.5 text-center"
              style={{
                background: '#F5F3FF',
                border: '1px solid #E9D5FF',
              }}
            >
              <p className="text-[7px] uppercase tracking-widest font-black" style={{ color: '#6B7280' }}>{t.totalDue}</p>
              <p className="font-mono text-xl font-black mt-0.5 tabular-nums" style={{ color: '#7C3AED' }}>
                {formatCurrency(saleTotal)}
              </p>
            </div>

            {/* Status indicator */}
            <div
              className="rounded-lg px-3 py-1.5 text-center"
              style={{
                background: isExact
                  ? '#ECFDF5'
                  : isOver
                  ? '#FEF2F2'
                  : '#FFFBEB',
                border: isExact
                  ? '1px solid #BBF7D0'
                  : isOver
                  ? '1px solid #FECACA'
                  : '1px solid #FDE68A',
              }}
            >
              <p
                className="text-[9px] font-black"
                style={{
                  color: isExact ? '#16A34A' : isOver ? '#DC2626' : '#D97706',
                }}
              >
                {isExact ? t.perfectMatch : isOver ? t.overpayWarning : t.shortWarning}
              </p>
              {!isExact && (
                <p className="text-[8px] font-mono mt-0.5" style={{ color: '#6B7280' }}>
                  {t.allocated}: {formatCurrency(totalAllocated)}
                </p>
              )}
            </div>

            {/* Quick split preset buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={quickHalf}
                className="rounded-lg py-1.5 text-[9px] font-black transition-all active:scale-95"
                style={{
                  border: '1px solid #E9D5FF',
                  background: '#F5F3FF',
                  color: '#7C3AED',
                }}
              >
                ⚖️ {t.half}
              </button>
              <button
                onClick={setMaxCash}
                className="rounded-lg py-1.5 text-[9px] font-black transition-all active:scale-95"
                style={{
                  border: '1px solid #BBF7D0',
                  background: '#ECFDF5',
                  color: '#16A34A',
                }}
              >
                💵 {t.setMax}
              </button>
            </div>

            {/* Cash input */}
            <div>
              <label className="block text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>
                💵 {t.cashAmount}
              </label>
              <input
                type="number"
                step="250"
                min="0"
                className="w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none transition-colors"
                style={{ background: '#FFFFFF', borderColor: cashAmt > 0 ? '#86EFAC' : '#E5E7EB', color: '#16A34A' }}
                value={cashInput}
                onChange={(e) => handleCashChange(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Card input */}
            <div>
              <label className="block text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>
                💳 {t.cardAmount}
              </label>
              <input
                type="number"
                step="250"
                min="0"
                className="w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none transition-colors"
                style={{ background: '#FFFFFF', borderColor: cardAmt > 0 ? '#BFDBFE' : '#E5E7EB', color: '#2563EB' }}
                value={cardInput}
                onChange={(e) => handleCardChange(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={!isExact || (cashAmt === 0 && cardAmt === 0)}
              className="w-full rounded-xl py-3 font-black text-xs uppercase tracking-widest transition-all duration-200 active:scale-95"
              style={
                isExact && (cashAmt > 0 || cardAmt > 0)
                  ? {
                      background: '#7C3AED',
                      color: '#fff',
                      boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                    }
                  : {
                      background: '#F3F4F6',
                      color: '#9CA3AF',
                      cursor: 'not-allowed',
                      border: '1px solid #E5E7EB',
                    }
              }
            >
              ✓ {t.confirm}
            </button>

            <button
              onClick={onBack}
              className="w-full text-[9px] font-black transition-colors py-1"
              style={{ color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t.cancel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
