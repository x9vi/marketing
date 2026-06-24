/**
 * InlineCashPanel — Professional Supermarket POS Cash Denomination Picker
 *
 * Renders inline inside the right checkout panel (no modal/popup).
 * The product grid, basket and order totals remain fully visible at all times.
 *
 * Features:
 *   • Real IQD banknote images as tap targets (4-column grid)
 *   • Live Sale Total / Received / Change LED display with colour states
 *   • Quantity badges on tapped notes
 *   • Scrollable selected-notes breakdown
 *   • Clear All / Remove Last / Exact Cash helpers
 *   • Confirm Payment button (enabled only when received ≥ total)
 *   • Smooth touch-screen animations
 *   • Fits entirely inside the right panel — no modal
 */

import { useState, useMemo, useCallback } from 'react';
import { formatCurrency } from '../lib/format.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NoteEntry {
  denomination: number;
  quantity: number;
}

export interface InlineCashPanelProps {
  saleTotal: number;
  lang: 'en' | 'ku';
  onConfirm: (received: number, change: number, notes: NoteEntry[]) => void;
  onBack: () => void;
}

// ─── Denomination config ──────────────────────────────────────────────────────

const DENOMS = [
  { value: 250,   label: '250',    img: '/assets/iqd_250.png' },
  { value: 500,   label: '500',    img: '/assets/iraq-500-dinars--dam---statue-winged---2018-unc-p-image-115573-moyenne.webp' },
  { value: 1000,  label: '1,000',  img: '/assets/20180719205708!IraqPNew-1000Dinars-2003_f.jpg' },
  { value: 5000,  label: '5,000',  img: '/assets/20170616220638!IraqPNew-5000Dinars-2003_f.jpg' },
  { value: 10000, label: '10,000', img: '/assets/iqd_10000.png' },
  { value: 25000, label: '25,000', img: '/assets/images.jpg' },
  { value: 50000, label: '50,000', img: '/assets/images (1).jpg' },
] as const;

type DenomValue = typeof DENOMS[number]['value'];

// ─── Translations ─────────────────────────────────────────────────────────────

const TX = {
  en: {
    cashPayment: 'Cash Payment',
    back: '← Back',
    tapNote: 'Tap a banknote to add',
    saleTotal: 'Sale Total',
    received: 'Received',
    remaining: 'Remaining',
    changeDue: 'Change Due',
    clear: 'Clear All',
    removeLast: 'Remove Last',
    exactCash: 'Exact Cash',
    confirmPay: 'Confirm Payment',
    noNotes: 'No banknotes selected yet',
    selectedNotes: 'Selected Notes',
    iqd: 'IQD',
    recv: 'recv',
    awaitingInput: 'Awaiting cash input...',
  },
  ku: {
    cashPayment: 'پارەی نەختی',
    back: '← گەڕانەوە',
    tapNote: 'نوتەکە بەستە بۆ زیادکردن',
    saleTotal: 'کۆی فرۆشتن',
    received: 'وەرگیراو',
    remaining: 'ماوەی پارە',
    changeDue: 'باقی',
    clear: 'پاکردنەوە',
    removeLast: 'سڕینی دوایی',
    exactCash: 'نەختی تەواو',
    confirmPay: 'پەسەندکردنی پارەدان',
    noNotes: 'نوتەیەک نەهاتووە',
    selectedNotes: 'نوتەی هەڵبژێردراو',
    iqd: 'د.ع',
    recv: 'وەرگیراو',
    awaitingInput: 'چاوەڕوانی تێکردنی پارە...',
  },
} as const;

// ─── NoteButton sub-component ─────────────────────────────────────────────────

function NoteButton({
  denom,
  count,
  onClick,
}: {
  denom: typeof DENOMS[number];
  count: number;
  onClick: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 100);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className="relative flex flex-col items-center focus:outline-none select-none cursor-pointer group"
      style={{
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        transition: 'transform 0.09s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Quantity badge */}
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white"
          style={{
            background: 'linear-gradient(135deg, #059669, #34d399)',
            border: '1.5px solid #020617',
            boxShadow: '0 0 8px rgba(52,211,153,0.8), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {count}
        </span>
      )}

      {/* Banknote image container */}
      <div
        className="w-full overflow-hidden"
        style={{
          borderRadius: 7,
          boxShadow: count > 0
            ? '0 0 0 2.5px #34d399, 0 4px 12px rgba(0,0,0,0.7)'
            : '0 2px 8px rgba(0,0,0,0.7)',
          filter: pressed
            ? 'brightness(0.7)'
            : count > 0
            ? 'brightness(1.08) saturate(1.15)'
            : 'brightness(0.9)',
          transition: 'filter 0.09s ease, box-shadow 0.15s ease',
        }}
      >
        {imgOk ? (
          <img
            src={denom.img}
            alt={`${denom.label} IQD`}
            className="w-full object-cover block group-hover:brightness-110 transition-all"
            style={{ height: 44, minWidth: '100%' }}
            onError={() => setImgOk(false)}
            draggable={false}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center"
            style={{
              height: 44,
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span className="text-[10px] font-black text-slate-300 font-mono">{denom.label}</span>
          </div>
        )}
      </div>

      {/* Label */}
      <span
        className="mt-1 text-[8px] font-black leading-none font-mono"
        style={{ color: count > 0 ? '#34d399' : '#475569' }}
      >
        {denom.label}
      </span>
    </button>
  );
}

// ─── Main InlineCashPanel ─────────────────────────────────────────────────────

export function InlineCashPanel({ saleTotal, lang, onConfirm, onBack }: InlineCashPanelProps) {
  const t = TX[lang];

  const [noteStack, setNoteStack] = useState<DenomValue[]>([]);

  // ── Derived totals ──
  const received  = useMemo(() => noteStack.reduce((s, n) => s + n, 0), [noteStack]);
  const change    = useMemo(() => Math.max(0, received - saleTotal), [received, saleTotal]);
  const remaining = useMemo(() => Math.max(0, saleTotal - received), [received, saleTotal]);
  const isFullyPaid = received >= saleTotal;
  const progress    = saleTotal > 0 ? Math.min(100, (received / saleTotal) * 100) : 0;

  // ── Note breakdown (grouped) ──
  const noteBreakdown = useMemo((): NoteEntry[] => {
    const map: Partial<Record<DenomValue, number>> = {};
    for (const n of noteStack) map[n] = (map[n] ?? 0) + 1;
    return DENOMS
      .filter(d => (map[d.value] ?? 0) > 0)
      .map(d => ({ denomination: d.value, quantity: map[d.value]! }))
      .sort((a, b) => b.denomination - a.denomination);
  }, [noteStack]);

  // ── Actions ──
  const addNote    = useCallback((v: DenomValue) => setNoteStack(p => [...p, v]), []);
  const removeLast = useCallback(() => setNoteStack(p => p.slice(0, -1)), []);
  const clearAll   = useCallback(() => setNoteStack([]), []);

  const setExactCash = useCallback(() => {
    const sorted = [...DENOMS].sort((a, b) => b.value - a.value);
    const stack: DenomValue[] = [];
    let rem = saleTotal;
    for (const d of sorted) {
      while (rem >= d.value) {
        stack.push(d.value);
        rem -= d.value;
      }
    }
    if (rem > 0) stack.push(sorted[sorted.length - 1].value);
    setNoteStack(stack);
  }, [saleTotal]);

  const handleConfirm = () => {
    if (!isFullyPaid) return;
    onConfirm(received, change, noteBreakdown);
    setNoteStack([]);
  };

  // ── Render ──
  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        borderTop: isFullyPaid ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.06)',
        transition: 'border-color 0.4s ease',
      }}
    >
      {/* ── Header bar ── */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(2,6,23,0.9) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/8 active:scale-95 transition-all"
        >
          {t.back}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">💵</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
            {t.cashPayment}
          </span>
        </div>
        <span className="text-[8px] text-slate-700 font-mono w-14 text-right leading-tight">
          {t.tapNote}
        </span>
      </div>

      {/* ── LED Totals Display ── */}
      <div
        className="grid grid-cols-4 border-b flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #020617 100%)',
          borderColor: 'rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 0 24px rgba(0,0,0,0.9)',
        }}
      >
        {/* Sale Total */}
        <div className="flex flex-col items-center py-2 px-1 border-r border-white/5">
          <span className="text-[6px] font-black uppercase tracking-widest text-slate-600">
            {t.saleTotal}
          </span>
          <span className="font-mono text-[10px] font-black text-white mt-0.5 tabular-nums">
            {formatCurrency(saleTotal)}
          </span>
        </div>

        {/* Received */}
        <div className="flex flex-col items-center py-2 px-1 border-r border-white/5">
          <span className="text-[6px] font-black uppercase tracking-widest text-slate-600">
            {t.received}
          </span>
          <span
            className="font-mono text-[10px] font-black mt-0.5 tabular-nums transition-colors duration-300"
            style={{ color: received === 0 ? '#334155' : isFullyPaid ? '#34d399' : '#f59e0b' }}
          >
            {formatCurrency(received)}
          </span>
        </div>

        {/* Remaining / Change */}
        <div className="flex flex-col items-center py-2 px-1 border-r border-white/5">
          <span
            className="text-[6px] font-black uppercase tracking-widest transition-colors duration-300"
            style={{ color: isFullyPaid ? '#059669' : '#f87171' }}
          >
            {isFullyPaid ? t.changeDue : t.remaining}
          </span>
          <span
            className="font-mono text-[10px] font-black mt-0.5 tabular-nums transition-colors duration-300"
            style={{ color: isFullyPaid ? '#34d399' : '#f87171' }}
          >
            {formatCurrency(isFullyPaid ? change : remaining)}
          </span>
        </div>

        {/* Progress bar column */}
        <div className="flex flex-col items-center justify-center py-2 px-1.5">
          <span className="text-[6px] font-black uppercase tracking-widest text-slate-600 mb-1">
            {Math.round(progress)}%
          </span>
          <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: isFullyPaid
                  ? 'linear-gradient(90deg, #059669, #34d399)'
                  : 'linear-gradient(90deg, #b45309, #f59e0b)',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex flex-col gap-2 p-2 bg-slate-950 flex-shrink-0">

        {/* ── Banknote Grid (4 columns × 2 rows) ── */}
        <div className="grid grid-cols-4 gap-1.5">
          {DENOMS.map(denom => (
            <NoteButton
              key={denom.value}
              denom={denom}
              count={noteStack.filter(n => n === denom.value).length}
              onClick={() => addNote(denom.value)}
            />
          ))}
        </div>

        {/* ── Selected notes scrollable list ── */}
        <div
          className="rounded-lg border bg-slate-900/60 overflow-y-auto scrollbar-thin flex-shrink-0"
          style={{
            borderColor: 'rgba(255,255,255,0.07)',
            minHeight: 40,
            maxHeight: 68,
          }}
        >
          {noteBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-10">
              <p className="text-[8px] text-slate-700 font-mono">{t.awaitingInput}</p>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {noteBreakdown.map(({ denomination, quantity }) => (
                <div
                  key={denomination}
                  className="flex items-center justify-between px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(15,23,42,0.7)' }}
                >
                  <span className="text-[9px] font-black text-white font-mono">
                    {denomination.toLocaleString()}{' '}
                    <span className="text-slate-500">{t.iqd}</span>{' '}
                    <span className="text-slate-400">×{quantity}</span>
                  </span>
                  <span className="text-[9px] font-black font-mono text-emerald-400">
                    {formatCurrency(denomination * quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Helper Action Buttons ── */}
        <div className="grid grid-cols-3 gap-1 flex-shrink-0">
          <button
            id="cash-inline-clear"
            onClick={clearAll}
            disabled={noteStack.length === 0}
            className="rounded-lg py-1.5 text-[9px] font-black transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-95"
            style={{
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.06)',
              color: '#f87171',
            }}
          >
            🗑 {t.clear}
          </button>
          <button
            id="cash-inline-remove-last"
            onClick={removeLast}
            disabled={noteStack.length === 0}
            className="rounded-lg py-1.5 text-[9px] font-black transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-95"
            style={{
              border: '1px solid rgba(245,158,11,0.2)',
              background: 'rgba(245,158,11,0.06)',
              color: '#fbbf24',
            }}
          >
            ⌫ {t.removeLast}
          </button>
          <button
            id="cash-inline-exact"
            onClick={setExactCash}
            className="rounded-lg py-1.5 text-[9px] font-black transition-all active:scale-95 hover:brightness-125"
            style={{
              border: '1px solid rgba(99,102,241,0.25)',
              background: 'rgba(99,102,241,0.08)',
              color: '#818cf8',
            }}
          >
            ⚡ {t.exactCash}
          </button>
        </div>

        {/* ── Confirm Payment Button ── */}
        <button
          id="pos-inline-cash-confirm"
          onClick={handleConfirm}
          disabled={!isFullyPaid}
          className="w-full rounded-xl py-3.5 font-black text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 flex-shrink-0"
          style={
            isFullyPaid
              ? {
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #059669 100%)',
                  backgroundSize: '200% auto',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.4), 0 0 0 1px rgba(52,211,153,0.3)',
                  animation: 'shimmer 2s linear infinite',
                }
              : {
                  background: '#0f172a',
                  color: '#334155',
                  cursor: 'not-allowed',
                  border: '1px solid rgba(255,255,255,0.04)',
                }
          }
        >
          <span className="text-base leading-none">{isFullyPaid ? '✓' : '⬜'}</span>
          <span>{t.confirmPay}</span>
          {isFullyPaid && (
            <span className="text-[9px] opacity-70 font-mono normal-case">
              ({formatCurrency(received)} {t.recv})
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
