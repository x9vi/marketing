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
        borderTop: '1px solid rgba(168,85,247,0.2)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(2,6,23,0.9) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <button
          onClick={onBack}
          disabled={cardStep !== 'idle'}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/8 active:scale-95 transition-all disabled:opacity-30"
        >
          {t.back}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">⚖️</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
            {t.splitPayment}
          </span>
        </div>
        <div className="w-14" />
      </div>

      {/* Split Body */}
      <div
        className="flex flex-col gap-2.5 p-3"
        style={{ background: 'linear-gradient(180deg, #000000 0%, #020617 100%)' }}
      >
        {cardStep !== 'idle' ? (
          /* Card terminal simulation */
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl py-8"
            style={{
              background: 'rgba(15,23,42,0.7)',
              border: cardStep === 'approved'
                ? '1px solid rgba(52,211,153,0.4)'
                : '1px solid rgba(168,85,247,0.3)',
            }}
          >
            {cardStep === 'connecting' && (
              <>
                <span className="h-8 w-8 rounded-full border-[3px] border-purple-500 border-t-transparent" style={{ animation: 'spin 0.8s linear infinite' }} />
                <p className="text-[11px] font-semibold text-slate-300">{t.connecting}</p>
              </>
            )}
            {cardStep === 'tap' && (
              <>
                <span className="text-4xl" style={{ animation: 'bounce 1s ease infinite' }}>💳</span>
                <p className="text-[11px] font-black text-white uppercase tracking-wider text-center px-4">{t.tapCard}</p>
                <p className="text-[10px] text-purple-400 font-mono">{formatCurrency(cardAmt)}</p>
              </>
            )}
            {cardStep === 'approving' && (
              <>
                <span className="h-8 w-8 rounded-full border-[3px] border-emerald-500 border-t-transparent" style={{ animation: 'spin 0.8s linear infinite' }} />
                <p className="text-[11px] font-semibold text-slate-300">{t.approving}</p>
              </>
            )}
            {cardStep === 'approved' && (
              <>
                <span className="text-4xl text-emerald-400">✓</span>
                <p className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">{t.approved}</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Total due display */}
            <div
              className="rounded-xl p-2.5 text-center"
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(168,85,247,0.15)',
                boxShadow: 'inset 0 0 16px rgba(0,0,0,0.7)',
              }}
            >
              <p className="text-[7px] uppercase tracking-widest text-slate-600 font-black">{t.totalDue}</p>
              <p className="font-mono text-xl font-black text-purple-300 mt-0.5 tabular-nums">
                {formatCurrency(saleTotal)}
              </p>
            </div>

            {/* Status indicator */}
            <div
              className="rounded-lg px-3 py-1.5 text-center"
              style={{
                background: isExact
                  ? 'rgba(16,185,129,0.1)'
                  : isOver
                  ? 'rgba(239,68,68,0.08)'
                  : 'rgba(245,158,11,0.08)',
                border: isExact
                  ? '1px solid rgba(52,211,153,0.25)'
                  : isOver
                  ? '1px solid rgba(239,68,68,0.2)'
                  : '1px solid rgba(245,158,11,0.2)',
              }}
            >
              <p
                className="text-[9px] font-black"
                style={{
                  color: isExact ? '#34d399' : isOver ? '#f87171' : '#fbbf24',
                }}
              >
                {isExact ? t.perfectMatch : isOver ? t.overpayWarning : t.shortWarning}
              </p>
              {!isExact && (
                <p className="text-[8px] font-mono text-slate-500 mt-0.5">
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
                  border: '1px solid rgba(168,85,247,0.2)',
                  background: 'rgba(168,85,247,0.07)',
                  color: '#c084fc',
                }}
              >
                ⚖️ {t.half}
              </button>
              <button
                onClick={setMaxCash}
                className="rounded-lg py-1.5 text-[9px] font-black transition-all active:scale-95"
                style={{
                  border: '1px solid rgba(52,211,153,0.2)',
                  background: 'rgba(52,211,153,0.07)',
                  color: '#34d399',
                }}
              >
                💵 {t.setMax}
              </button>
            </div>

            {/* Cash input */}
            <div>
              <label className="block text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">
                💵 {t.cashAmount}
              </label>
              <input
                type="number"
                step="250"
                min="0"
                className="w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm font-mono text-emerald-300 focus:outline-none transition-colors"
                style={{ borderColor: cashAmt > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)' }}
                value={cashInput}
                onChange={(e) => handleCashChange(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Card input */}
            <div>
              <label className="block text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">
                💳 {t.cardAmount}
              </label>
              <input
                type="number"
                step="250"
                min="0"
                className="w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm font-mono text-indigo-300 focus:outline-none transition-colors"
                style={{ borderColor: cardAmt > 0 ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)' }}
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
                      background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                      color: '#fff',
                      boxShadow: '0 4px 20px rgba(168,85,247,0.4), 0 0 0 1px rgba(192,132,252,0.3)',
                    }
                  : {
                      background: '#0f172a',
                      color: '#334155',
                      cursor: 'not-allowed',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }
              }
            >
              ✓ {t.confirm}
            </button>

            <button
              onClick={onBack}
              className="w-full text-[9px] font-black text-slate-600 hover:text-slate-400 transition-colors py-1"
            >
              {t.cancel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
