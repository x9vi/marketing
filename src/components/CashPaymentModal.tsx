/**
 * CashPaymentModal — Iraqi Dinar POS Cash Payment Screen
 *
 * Redesigned for:
 *   • Larger, high-quality banknote images (object-contain, dark bg, proper aspect ratio)
 *   • Single-screen layout at 100% zoom — no scrolling needed
 *   • All action buttons always visible
 *   • Compact padding/spacing throughout
 *   • Clean professional supermarket POS aesthetic
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

export interface NoteEntry {
  denomination: number;
  quantity: number;
}

export interface CashPaymentModalProps {
  saleTotal: number;
  onConfirm: (receivedAmount: number, changeAmount: number, noteBreakdown: NoteEntry[]) => void;
  onCancel: () => void;
  lang?: 'en' | 'ku';
  cashierName?: string;
}

// ─── Denomination config ──────────────────────────────────────────────────────

const DENOMINATIONS = [
  {
    value: 250,    label: '250',    arabic: '٢٥٠',   img: '/assets/iqd_250.png',
    imgPos: 'center center',
    currency: 'IQD',
    bg: '#b8bec8', bgGrad: 'linear-gradient(135deg,#c8cdd6 0%,#9ea6b2 40%,#b2b8c4 100%)',
    rosette: '#7a8291', text: '#2c3240', border: '#8a919e', accent: '#6b7280',
  },
  {
    value: 500,    label: '500',    arabic: '٥٠٠',   img: '/assets/iraq-500-dinars--dam---statue-winged---2018-unc-p-image-115573-moyenne.webp',
    imgPos: 'center center',
    currency: 'IQD',
    bg: '#2da89a', bgGrad: 'linear-gradient(135deg,#3dbdae 0%,#1a8a7d 40%,#2da89a 100%)',
    rosette: '#12665e', text: '#e0f5f3', border: '#1a7a6e', accent: '#a8ede8',
  },
  {
    value: 1000,   label: '1,000',  arabic: '١٠٠٠',  img: '/assets/20180719205708!IraqPNew-1000Dinars-2003_f.jpg',
    imgPos: 'center center',
    currency: 'IQD',
    bg: '#c4621a', bgGrad: 'linear-gradient(135deg,#d4722a 0%,#a84e10 40%,#c4621a 100%)',
    rosette: '#7a3208', text: '#fff0e0', border: '#8a3e10', accent: '#f5c89a',
  },
  {
    value: 5000,   label: '5,000',  arabic: '٥٠٠٠',  img: '/assets/20170616220638!IraqPNew-5000Dinars-2003_f.jpg',
    imgPos: 'center center',
    currency: 'IQD',
    bg: '#7b5ea7', bgGrad: 'linear-gradient(135deg,#9070c0 0%,#5e4488 40%,#7b5ea7 100%)',
    rosette: '#3d2a60', text: '#f0eaff', border: '#5a3e84', accent: '#d4b8f8',
  },
  {
    // Square photo: note occupies middle band; cover + center 53% clips dark bg top/bottom
    value: 10000,  label: '10,000', arabic: '١٠٠٠٠', img: '/assets/images (3).jpg',
    imgPos: 'center center',
    currency: 'IQD',
    bg: '#7a8c2a', bgGrad: 'linear-gradient(135deg,#90a030 0%,#5e6e18 40%,#7a8c2a 100%)',
    rosette: '#3e4e0a', text: '#f0f5d0', border: '#5a6e18', accent: '#d4e880',
  },
  {
    value: 25000,  label: '25,000', arabic: '٢٥٠٠٠', img: '/assets/images.jpg',
    imgPos: 'center center',
    currency: 'IQD',
    bg: '#b82020', bgGrad: 'linear-gradient(135deg,#cc2828 0%,#8a1010 40%,#b82020 100%)',
    rosette: '#5a0808', text: '#fff0f0', border: '#8a1010', accent: '#f5a0a0',
  },
  {
    value: 50000,  label: '50,000', arabic: '٥٠٠٠٠', img: '/assets/images (1).jpg',
    imgPos: 'center center',
    currency: 'IQD',
    bg: '#d4c8a0', bgGrad: 'linear-gradient(135deg,#e4d8b0 0%,#b8aa7a 40%,#d4c8a0 100%)',
    rosette: '#8a7840', text: '#2a2010', border: '#9a8a50', accent: '#6a5820',
  },
  {
    value: 130000, label: '$100',   arabic: '$100',   img: '/assets/images (2).jpg',
    imgPos: 'center center',
    currency: 'USD',
    bg: '#2d6a2d', bgGrad: 'linear-gradient(135deg,#3d8a3d 0%,#1a4d1a 40%,#2d6a2d 100%)',
    rosette: '#1a4d1a', text: '#e8f5e8', border: '#1a5c1a', accent: '#90ee90',
  },
  {
    value: 26000,  label: '$20',    arabic: '$20',    img: '/assets/photo_2026-07-02_17-56-05.jpg',
    imgPos: 'center center',
    currency: 'USD',
    bg: '#2d6a2d', bgGrad: 'linear-gradient(135deg,#3d8a3d 0%,#1a4d1a 40%,#2d6a2d 100%)',
    rosette: '#1a4d1a', text: '#e8f5e8', border: '#1a5c1a', accent: '#90ee90',
  },
  {
    value: 65000,  label: '$50',    arabic: '$50',    img: '/assets/photo_2026-07-02_17-56-31.jpg',
    imgPos: 'center center',
    currency: 'USD',
    bg: '#2d6a2d', bgGrad: 'linear-gradient(135deg,#3d8a3d 0%,#1a4d1a 40%,#2d6a2d 100%)',
    rosette: '#1a4d1a', text: '#e8f5e8', border: '#1a5c1a', accent: '#90ee90',
  },
] as const;

type DenomValue = typeof DENOMINATIONS[number]['value'];

function fmtIQD(v: number) {
  return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(v);
}

async function openCashDrawer() { console.info('[CashDrawer] ✅ open'); }
async function printCashReceipt(p: { saleTotal: number; received: number; change: number; notes: NoteEntry[]; cashierName?: string }) {
  console.info('[Receipt] 🖨️', p);
}

const T = {
  en: {
    title: 'Cash Payment', subtitle: 'Tap a banknote to add it',
    saleTotal: 'Sale Total', received: 'Received',
    remaining: 'Remaining', changeDue: 'Change Due',
    selectedNotes: 'Banknotes Selected', noNotes: 'No banknotes selected',
    clear: 'Clear All', removeLast: 'Undo Last', exactCash: 'Exact Cash',
    confirmPay: 'Confirm Payment', cancel: 'Cancel',
    iqd: 'IQD', qty: '×', processing: 'Processing…', quickAdd: 'Quick Add',
  },
  ku: {
    title: 'پارەی نەختینە', subtitle: 'نوتەکە بەستە بۆ زیادکردن',
    saleTotal: 'کۆی فرۆشتن', received: 'وەرگیراو',
    remaining: 'ماوەی پارە', changeDue: 'باقی',
    selectedNotes: 'نوتەی هەڵبژێردراو', noNotes: 'هیچ نوتەیەک نەهاتووە',
    clear: 'پاکردنەوە', removeLast: 'سڕینی دوایی', exactCash: 'نەختی تەواو',
    confirmPay: 'پەسەندکردنی پارەدان', cancel: 'پاشگەزبوونەوە',
    iqd: 'د.ع', qty: '×', processing: 'لە پرۆسەدایە…', quickAdd: 'زیادکردنی خێرا',
  },
} as const;

// ─── CSS Banknote (fallback) ──────────────────────────────────────────────────

function CssBanknote({ denom, small = false }: { denom: typeof DENOMINATIONS[number]; small?: boolean }) {
  const sz = small ? { h: 26, rosetteR: 9, fontSize: 7, labelSize: 7 } : { h: 60, rosetteR: 20, fontSize: 10, labelSize: 9 };
  return (
    <div style={{
      background: denom.bgGrad, border: `1.5px solid ${denom.border}`,
      borderRadius: small ? 4 : 7, height: sz.h, position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: small ? '0 5px' : '0 8px',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15)',
    }}>
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.1, width: '100%', height: '100%' }} preserveAspectRatio="none">
        {[0,5,10,15,20,25].map((y, i) => (
          <path key={i} d={`M0,${y} Q25,${y-2} 50,${y} Q75,${y+2} 100,${y}`} fill="none" stroke={denom.text} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <svg width={sz.rosetteR * 2} height={sz.rosetteR * 2} style={{ flexShrink: 0, opacity: 0.8 }}>
        <circle cx={sz.rosetteR} cy={sz.rosetteR} r={sz.rosetteR - 1} fill="none" stroke={denom.rosette} strokeWidth="1" />
        <circle cx={sz.rosetteR} cy={sz.rosetteR} r={sz.rosetteR * 0.55} fill="none" stroke={denom.rosette} strokeWidth="0.7" />
        <circle cx={sz.rosetteR} cy={sz.rosetteR} r={sz.rosetteR * 0.25} fill={denom.rosette} opacity="0.55" />
      </svg>
      <div style={{ flex: 1, textAlign: 'center', padding: '0 3px' }}>
        <div style={{ fontSize: sz.fontSize - 2, color: denom.text, opacity: 0.65, fontFamily: 'serif', lineHeight: 1 }}>
          {small ? '' : 'البنك المركزي العراقي'}
        </div>
        {!small && (
          <div style={{ fontSize: sz.fontSize + 1, fontWeight: 900, color: denom.text, fontFamily: 'monospace', lineHeight: 1.1 }}>
            {denom.arabic}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: sz.fontSize + (small ? 0 : 1), fontWeight: 900, color: denom.text, fontFamily: 'monospace', lineHeight: 1 }}>
          {denom.label}
        </div>
        {!small && <div style={{ fontSize: sz.labelSize - 2, color: denom.text, opacity: 0.55, fontFamily: 'monospace' }}>IQD</div>}
      </div>
      <div style={{
        position: 'absolute', left: '30%', top: 0, bottom: 0, width: 1.5,
        background: `linear-gradient(180deg,transparent 0%,${denom.accent}80 20%,${denom.accent} 50%,${denom.accent}80 80%,transparent 100%)`,
      }} />
    </div>
  );
}

// ─── BanknoteButton ───────────────────────────────────────────────────────────

function BanknoteButton({
  denom, count, onClick, iqd,
}: {
  denom: typeof DENOMINATIONS[number]; count: number; onClick: () => void; iqd: string;
}) {
  const [imgOk, setImgOk] = useState(true);
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 120);
    onClick();
  };

  return (
    // Outer wrapper: grid cell context — no fixed height, just column width
    <div className="relative flex flex-col items-stretch">
      {/* Quantity badge */}
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white border border-emerald-200 shadow-md shadow-emerald-500/60">
          {count}
        </span>
      )}

      {/* Image card button — fixed aspect-ratio so every card is identical */}
      <button
        id={`cash-note-${denom.value}`}
        onClick={handleClick}
        className="focus:outline-none select-none cursor-pointer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          /* Enforce uniform card size — all notes same width × same height */
          width: '100%',
          aspectRatio: '2.2 / 1',
          padding: 3,
          boxSizing: 'border-box',
          background: '#ffffff',
          border: 'none',
          borderRadius: 7,
          overflow: 'hidden',
          boxShadow: count > 0
            ? '0 0 0 2.5px #34d399, 0 0 10px rgba(52,211,153,0.45), 0 2px 8px rgba(0,0,0,0.5)'
            : '0 2px 8px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.35)',
          filter: pressed ? 'brightness(0.84)' : count > 0 ? 'brightness(1.06)' : 'brightness(1)',
          transform: pressed ? 'scale(0.92)' : 'scale(1)',
          transition: 'transform 0.1s ease, filter 0.1s ease, box-shadow 0.15s ease',
        }}
      >
        {imgOk ? (
          <img
            src={denom.img}
            alt={`${denom.label} ${denom.currency}`}
            draggable={false}
            onError={() => setImgOk(false)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center center',
              display: 'block',
            }}
          />
        ) : (
          <CssBanknote denom={denom} />
        )}
      </button>

      {/* Label — outside the aspect-ratio button so it never affects card height */}
      <div style={{ marginTop: 3, textAlign: 'center', lineHeight: 1 }}>
        <span style={{
          fontSize: 9, fontWeight: 900, fontFamily: 'monospace',
          color: denom.currency === 'USD' ? '#86efac' : count > 0 ? '#34d399' : '#d1d5db',
        }}>
          {denom.label}
        </span>
        <span style={{
          fontSize: 7, marginLeft: 2, fontFamily: 'monospace',
          color: denom.currency === 'USD' ? '#4ade80' : '#6b7280',
        }}>
          {denom.currency === 'USD' ? 'USD' : iqd}
        </span>
      </div>
    </div>
  );
}

// ─── Thumbnail (breakdown list) ───────────────────────────────────────────────

function BanknoteThumbnail({ denom }: { denom: typeof DENOMINATIONS[number] }) {
  const [imgOk, setImgOk] = useState(true);
  return imgOk ? (
    <img
      src={denom.img}
      alt={denom.label}
      draggable={false}
      onError={() => setImgOk(false)}
      style={{
        width: '100%', height: 22, objectFit: 'cover',
        objectPosition: 'imgPos' in denom ? denom.imgPos : 'center center',
        display: 'block', borderRadius: 3,
      }}
    />
  ) : (
    <CssBanknote denom={denom} small />
  );
}

// ─── Placeholder slot (reserved for future denominations) ───────────────────

function ModalPlaceholderSlot() {
  return (
    <div className="flex flex-col items-stretch">
      <div style={{
        aspectRatio: '2.2 / 1',
        borderRadius: 7,
        border: '1.5px dashed rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.15)', lineHeight: 1 }}>+</span>
      </div>
      <div style={{ marginTop: 3, height: 9 }} />
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function CashPaymentModal({
  saleTotal, onConfirm, onCancel, lang = 'en', cashierName,
}: CashPaymentModalProps) {
  const t = T[lang];
  const isRtl = lang === 'ku';

  const [noteStack, setNoteStack] = useState<DenomValue[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const receivedAmount = useMemo(() => noteStack.reduce((s, n) => s + n, 0), [noteStack]);
  const changeDue      = useMemo(() => Math.max(0, receivedAmount - saleTotal), [receivedAmount, saleTotal]);
  const remaining      = useMemo(() => Math.max(0, saleTotal - receivedAmount), [receivedAmount, saleTotal]);
  const isFullyPaid    = receivedAmount >= saleTotal;
  const progressPct    = saleTotal > 0 ? Math.min(100, (receivedAmount / saleTotal) * 100) : 0;

  const noteBreakdown = useMemo((): NoteEntry[] => {
    const map: Partial<Record<DenomValue, number>> = {};
    for (const n of noteStack) map[n] = (map[n] ?? 0) + 1;
    return DENOMINATIONS.filter((d) => (map[d.value] ?? 0) > 0)
      .map((d) => ({ denomination: d.value, quantity: map[d.value]! }))
      .sort((a, b) => b.denomination - a.denomination);
  }, [noteStack]);

  const addNote    = useCallback((v: DenomValue) => setNoteStack((p) => [...p, v]), []);
  const removeLast = useCallback(() => setNoteStack((p) => p.slice(0, -1)), []);
  const clearAll   = useCallback(() => setNoteStack([]), []);

  const setExactCash = useCallback(() => {
    const sorted = [...DENOMINATIONS].sort((a, b) => b.value - a.value);
    const stack: DenomValue[] = [];
    let rem = saleTotal;
    for (const d of sorted) { while (rem >= d.value) { stack.push(d.value); rem -= d.value; } }
    if (rem > 0) stack.push(sorted[sorted.length - 1].value);
    setNoteStack(stack);
  }, [saleTotal]);

  const handleConfirm = useCallback(async () => {
    if (!isFullyPaid) return;
    setIsProcessing(true);
    try {
      await openCashDrawer();
      await printCashReceipt({ saleTotal, received: receivedAmount, change: changeDue, notes: noteBreakdown, cashierName });
      onConfirm(receivedAmount, changeDue, noteBreakdown);
    } finally { setIsProcessing(false); }
  }, [isFullyPaid, saleTotal, receivedAmount, changeDue, noteBreakdown, cashierName, onConfirm]);

  const iqdNotes = DENOMINATIONS.filter(d => d.currency === 'IQD');
  const usdNotes = DENOMINATIONS.filter(d => d.currency === 'USD');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-2"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog" aria-modal="true"
    >
      {/* Panel — wide, compact height */}
      <div className="relative w-full max-w-[920px] flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden"
        style={{ maxHeight: '95vh' }}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-black/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm">💵</span>
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white leading-none">{t.title}</h2>
              <p className="text-[8px] text-slate-400 font-mono mt-0.5">🇮🇶 {t.subtitle}</p>
            </div>
          </div>
          <div className="rounded-lg bg-black border border-emerald-500/20 px-3 py-1 text-right shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
            <span className="block text-[7px] font-black uppercase tracking-widest text-slate-500">{t.saleTotal}</span>
            <span className="font-mono text-base font-black text-emerald-400 leading-none">{fmtIQD(saleTotal)}</span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* LEFT — banknotes + actions */}
          <div className="flex flex-col flex-[1.4] p-3 gap-2.5 border-r border-white/8 min-w-0 overflow-hidden">

            {/* IQD banknote grid — 5 columns */}
            <div className="grid grid-cols-5 gap-2 items-start">
              {iqdNotes.map((denom) => (
                <BanknoteButton
                  key={denom.value}
                  denom={denom}
                  count={noteStack.filter((n) => n === denom.value).length}
                  onClick={() => addNote(denom.value)}
                  iqd={t.iqd}
                />
              ))}
            </div>

            {/* USD separator */}
            <div className="flex items-center gap-1.5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[7px] font-black uppercase tracking-widest text-green-400/80">🇺🇸 USD</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* USD banknotes — single row */}
            <div className="grid grid-cols-3 gap-2 items-start">
              {usdNotes.map((denom) => (
                <BanknoteButton
                  key={denom.value}
                  denom={denom}
                  count={noteStack.filter((n) => n === denom.value).length}
                  onClick={() => addNote(denom.value)}
                  iqd={t.iqd}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-1.5 flex-shrink-0">
              <button id="cash-action-clear" onClick={clearAll} disabled={noteStack.length === 0}
                className="flex items-center justify-center gap-1 rounded-lg border border-red-500/25 bg-red-500/8 py-1.5 text-[9px] font-black text-red-400 hover:bg-red-500/18 hover:text-red-300 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
                🗑️ {t.clear}
              </button>
              <button id="cash-action-remove-last" onClick={removeLast} disabled={noteStack.length === 0}
                className="flex items-center justify-center gap-1 rounded-lg border border-orange-500/25 bg-orange-500/8 py-1.5 text-[9px] font-black text-orange-400 hover:bg-orange-500/18 hover:text-orange-300 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
                ⌫ {t.removeLast}
              </button>
              <button id="cash-action-exact" onClick={setExactCash}
                className="flex items-center justify-center gap-1 rounded-lg border border-blue-500/25 bg-blue-500/8 py-1.5 text-[9px] font-black text-blue-400 hover:bg-blue-500/18 hover:text-blue-300 active:scale-95 transition-all">
                ⚡ {t.exactCash}
              </button>
            </div>

            {/* Breakdown list — compact scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border border-white/8 bg-slate-950/60 p-2 scrollbar-thin">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{t.selectedNotes}</p>
              {noteBreakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-14 text-slate-700 gap-1">
                  <span className="text-2xl opacity-25">💸</span>
                  <p className="text-[9px] font-semibold text-slate-600">{t.noNotes}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {noteBreakdown.map(({ denomination, quantity }) => {
                    const d = DENOMINATIONS.find((x) => x.value === denomination)!;
                    return (
                      <div key={denomination} className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-slate-900/60 px-2 py-1">
                        <div className="flex-shrink-0" style={{ width: 48, borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                          <BanknoteThumbnail denom={d} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-black" style={{ color: d.currency === 'USD' ? '#86efac' : '#ffffff' }}>
                            {d.label} {d.currency === 'USD' ? 'USD' : t.iqd}
                          </span>
                          <span className="ml-1 text-[8px] text-slate-400 font-mono">{t.qty}{quantity}</span>
                        </div>
                        <span className="font-mono text-[11px] font-black text-emerald-400 flex-shrink-0">{fmtIQD(denomination * quantity)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — totals + confirm */}
          <div className="flex flex-col w-52 flex-shrink-0 p-3 gap-2">

            {/* LED totals */}
            <div className="rounded-xl border border-white/8 bg-slate-950 overflow-hidden flex-shrink-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t.saleTotal}</span>
                <span className="font-mono text-[11px] font-black text-white">{fmtIQD(saleTotal)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t.received}</span>
                <span className={`font-mono text-sm font-black tabular-nums transition-colors ${
                  receivedAmount === 0 ? 'text-slate-600' : isFullyPaid ? 'text-emerald-400' : 'text-amber-400'
                }`}>{fmtIQD(receivedAmount)}</span>
              </div>
              {isFullyPaid ? (
                <div className="px-3 py-2 bg-emerald-500/6">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">{t.changeDue}</span>
                    <span className="font-mono text-base font-black text-emerald-400 tabular-nums">{fmtIQD(changeDue)}</span>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-red-500/6">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase tracking-widest text-red-400">{t.remaining}</span>
                    <span className="font-mono text-base font-black text-red-400 tabular-nums">{fmtIQD(remaining)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="rounded-full bg-slate-800 h-1.5 overflow-hidden flex-shrink-0">
              <div className={`h-full rounded-full transition-all duration-300 ${isFullyPaid ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                style={{ width: `${progressPct}%` }} />
            </div>

            {/* Quick add */}
            <div className="flex-shrink-0">
              <p className="text-[7px] text-slate-600 font-black uppercase tracking-widest mb-1">{t.quickAdd}</p>
              <div className="grid grid-cols-2 gap-1">
                {([50000, 25000, 10000, 5000] as DenomValue[]).map((v) => {
                  const d = DENOMINATIONS.find((x) => x.value === v)!;
                  return (
                    <button key={v} id={`cash-quick-${v}`} onClick={() => addNote(v)}
                      className="rounded-md overflow-hidden border border-white/15 hover:border-white/30 transition-all active:scale-95 group"
                      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                    >
                      <div style={{ height: 20, position: 'relative', overflow: 'hidden', background: d.bgGrad }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.15s' }} className="group-hover:bg-white/10" />
                        <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 7, fontWeight: 900, color: d.text, fontFamily: 'monospace' }}>
                          {d.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1" />

            {/* Confirm */}
            <button id="cash-confirm-payment" onClick={() => void handleConfirm()} disabled={!isFullyPaid || isProcessing}
              className={`w-full rounded-xl py-3 font-black text-[11px] uppercase tracking-widest flex flex-col items-center gap-0.5 transition-all duration-200 flex-shrink-0 ${
                isFullyPaid && !isProcessing
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}>
              {isProcessing ? (
                <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span className="text-[9px]">{t.processing}</span></>
              ) : (
                <><span className="text-base">✓</span><span>{t.confirmPay}</span>
                  {isFullyPaid && <span className="text-[8px] font-bold opacity-70 font-mono">{fmtIQD(receivedAmount)} received</span>}
                </>
              )}
            </button>

            {/* Cancel */}
            <button id="cash-cancel-payment" onClick={onCancel} disabled={isProcessing}
              className="w-full rounded-xl border border-white/10 bg-transparent py-1.5 text-[9px] font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition-all disabled:opacity-40 active:scale-[0.98] flex-shrink-0">
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
