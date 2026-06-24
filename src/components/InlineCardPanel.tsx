/**
 * InlineCardPanel — Professional POS inline card payment panel
 * Replaces the right checkout panel with a card terminal experience.
 * No modal/popup — lives inside the existing right panel.
 */

import { useState, useEffect } from 'react';
import { formatCurrency } from '../lib/format.js';

export interface InlineCardPanelProps {
  saleTotal: number;
  lang: 'en' | 'ku';
  onConfirm: () => void;
  onBack: () => void;
}

type CardStep = 'idle' | 'connecting' | 'tap' | 'approving' | 'approved';

const TX = {
  en: {
    cardPayment: 'Card Payment',
    back: '← Back',
    total: 'Total Due',
    processCard: 'Process Card Payment',
    connecting: 'Connecting to terminal...',
    tapCard: 'TAP / INSERT / SWIPE CARD',
    approving: 'Authorizing transaction...',
    approved: 'Transaction Approved',
    cancel: 'Cancel',
    waitingCard: 'Waiting for card...',
  },
  ku: {
    cardPayment: 'پارەدانی کارتی',
    back: '← گەڕانەوە',
    total: 'کۆی گشتی شایستە',
    processCard: 'پرۆسەکردنی پارەدانی کارت',
    connecting: 'پەیوەندیکردن بە تێرمیناڵ...',
    tapCard: 'کارتەکە لێبدە / دابنێ / بکێش',
    approving: 'لە پرۆسەی پەسەندکردندایە...',
    approved: 'پارەدان پەسەندکرا',
    cancel: 'پاشگەزبوونەوە',
    waitingCard: 'چاوەڕوانی کارت...',
  },
} as const;

export function InlineCardPanel({ saleTotal, lang, onConfirm, onBack }: InlineCardPanelProps) {
  const t = TX[lang];
  const [step, setStep] = useState<CardStep>('idle');

  const handleProcess = () => {
    setStep('connecting');
    setTimeout(() => {
      setStep('tap');
      setTimeout(() => {
        setStep('approving');
        setTimeout(() => {
          setStep('approved');
          setTimeout(() => {
            onConfirm();
          }, 900);
        }, 1500);
      }, 1800);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      // Reset on unmount
      setStep('idle');
    };
  }, []);

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        borderTop: '1px solid rgba(99,102,241,0.2)',
        transition: 'border-color 0.4s ease',
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
          disabled={step !== 'idle'}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/8 active:scale-95 transition-all disabled:opacity-30"
        >
          {t.back}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">💳</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            {t.cardPayment}
          </span>
        </div>
        <div className="w-14" />
      </div>

      {/* Card Terminal Body */}
      <div
        className="flex flex-col items-center justify-center gap-4 p-4"
        style={{ background: 'linear-gradient(180deg, #000000 0%, #020617 100%)' }}
      >
        {/* Total display */}
        <div
          className="w-full rounded-xl p-3 text-center"
          style={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
          }}
        >
          <p className="text-[8px] uppercase tracking-widest text-slate-600 font-black">{t.total}</p>
          <p className="font-mono text-2xl font-black text-indigo-300 mt-0.5 tabular-nums">
            {formatCurrency(saleTotal)}
          </p>
        </div>

        {/* Terminal status area */}
        <div
          className="w-full rounded-xl flex flex-col items-center justify-center gap-3 py-6"
          style={{
            background: 'rgba(15,23,42,0.7)',
            border: step === 'approved'
              ? '1px solid rgba(52,211,153,0.4)'
              : step !== 'idle'
              ? '1px solid rgba(99,102,241,0.3)'
              : '1px solid rgba(255,255,255,0.06)',
            minHeight: 120,
            transition: 'border-color 0.4s ease',
          }}
        >
          {step === 'idle' && (
            <>
              <span className="text-4xl opacity-30">💳</span>
              <p className="text-[10px] text-slate-600 font-mono">{t.waitingCard}</p>
            </>
          )}

          {step === 'connecting' && (
            <>
              <span
                className="h-9 w-9 rounded-full border-[3px] border-indigo-500 border-t-transparent"
                style={{ animation: 'spin 0.8s linear infinite' }}
              />
              <p className="text-[11px] font-semibold text-slate-300">{t.connecting}</p>
            </>
          )}

          {step === 'tap' && (
            <>
              <span className="text-4xl" style={{ animation: 'bounce 1s ease infinite' }}>💳</span>
              <p className="text-[11px] font-black text-white uppercase tracking-wider text-center px-4">
                {t.tapCard}
              </p>
            </>
          )}

          {step === 'approving' && (
            <>
              <span
                className="h-9 w-9 rounded-full border-[3px] border-emerald-500 border-t-transparent"
                style={{ animation: 'spin 0.8s linear infinite' }}
              />
              <p className="text-[11px] font-semibold text-slate-300">{t.approving}</p>
            </>
          )}

          {step === 'approved' && (
            <>
              <span className="text-4xl text-emerald-400">✓</span>
              <p className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">{t.approved}</p>
            </>
          )}
        </div>

        {/* Process button */}
        {step === 'idle' && (
          <button
            onClick={handleProcess}
            className="w-full rounded-xl py-3.5 font-black text-xs uppercase tracking-widest transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4), 0 0 0 1px rgba(129,140,248,0.3)',
            }}
          >
            <span className="mr-2">💳</span>
            {t.processCard}
          </button>
        )}

        {step === 'idle' && (
          <button
            onClick={onBack}
            className="w-full rounded-xl py-2 text-[10px] font-black text-slate-500 hover:text-slate-300 transition-colors"
          >
            {t.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
