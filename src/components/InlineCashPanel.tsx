/**
 * InlineCashPanel — Supermarket POS Cash Payment
 *
 * Real layout (matching the running app screenshot):
 *   ┌──────────────────────────────────────────────────┐
 *   │  ← Back   💱 CASH PAYMENT        Tap note to add │
 *   ├──────────────────────────────────────────────────┤
 *   │  [250]  [500]  [1,000]  [5,000]                  │ ← banknote grid (4 cols × 2 rows)
 *   │ [10k]  [25k]  [50k]    [$100]                    │
 *   ├────────────────────┬─────────────────────────────┤
 *   │ SALE TOTAL  10,000 │  [Enter amount]        IQD  │
 *   │ RECEIVED       0   │  [7][8][9][+]               │
 *   │ CHANGE DUE 10,000  │  [4][5][6][-]               │
 *   │                    │  [1][2][3][×]               │
 *   │ [Clear][Undo][Exact]│  [C][0][00][÷]              │
 *   ├──────────────────────────────────────────────────┤
 *   │         ✓  CONFIRM PAYMENT  (د.ع 10,000 change)  │
 *   └──────────────────────────────────────────────────┘
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
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
  { value: 250,    label: '250',    currency: 'IQD', img: '/assets/iqd_250.png',                                                              imgPos: 'center center' },
  { value: 500,    label: '500',    currency: 'IQD', img: '/assets/iraq-500-dinars--dam---statue-winged---2018-unc-p-image-115573-moyenne.webp', imgPos: 'center center' },
  { value: 1000,   label: '1,000',  currency: 'IQD', img: '/assets/20180719205708!IraqPNew-1000Dinars-2003_f.jpg',                             imgPos: 'center center' },
  { value: 5000,   label: '5,000',  currency: 'IQD', img: '/assets/20170616220638!IraqPNew-5000Dinars-2003_f.jpg',                             imgPos: 'center center' },
  { value: 10000,  label: '10,000', currency: 'IQD', img: '/assets/images (3).jpg',                                                                  imgPos: 'center center' },
  { value: 25000,  label: '25,000', currency: 'IQD', img: '/assets/images.jpg',                                                               imgPos: 'center center' },
  { value: 50000,  label: '50,000', currency: 'IQD', img: '/assets/images (1).jpg',                                                           imgPos: 'center center' },
  { value: 130000, label: '$100',   currency: 'USD', img: '/assets/images (2).jpg',                                                              imgPos: 'center center' },
  { value: 26000,  label: '$20',    currency: 'USD', img: '/assets/photo_2026-07-02_17-56-05.jpg',                                              imgPos: 'center center' },
  { value: 65000,  label: '$50',    currency: 'USD', img: '/assets/photo_2026-07-02_17-56-31.jpg',                                              imgPos: 'center center' },
] as const;

type DenomValue = typeof DENOMS[number]['value'];

// ─── Keypad key type ──────────────────────────────────────────────────────────

type KeyValue = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'00'|'C'|'+'|'-'|'×'|'÷';

// ─── Translations ─────────────────────────────────────────────────────────────

const TX = {
  en: {
    cashPayment: 'CASH PAYMENT',
    back: '← Back',
    tapNote: 'Tap note to add',
    saleTotal: 'SALE TOTAL',
    received: 'RECEIVED',
    changeDue: 'CHANGE DUE',
    remaining: 'REMAINING',
    clear: 'Clear All',
    undoLast: 'Undo Last',
    exact: 'Exact',
    confirmPay: 'CONFIRM PAYMENT',
    enterAmount: 'Enter amount',
    currency: 'IQD',
    change: 'change',
  },
  ku: {
    cashPayment: 'پارەی نەختی',
    back: '← گەڕانەوە',
    tapNote: 'نوتەکە بەستە',
    saleTotal: 'کۆی فرۆشتن',
    received: 'وەرگیراو',
    changeDue: 'باقی',
    remaining: 'ماوە',
    clear: 'پاکردنەوە',
    undoLast: 'سڕینی دوایی',
    exact: 'تەواو',
    confirmPay: 'پەسەندکردنی پارەدان',
    enterAmount: 'بڕی پارە',
    currency: 'د.ع',
    change: 'باقی',
  },
} as const;

// ─── Fallback CSS banknote ────────────────────────────────────────────────────

const NOTE_COLORS: Record<number, { bg: string; text: string }> = {
  250:    { bg: 'linear-gradient(135deg,#c8cdd6,#9ea6b2)', text: '#2c3240' },
  500:    { bg: 'linear-gradient(135deg,#3dbdae,#1a8a7d)', text: '#e0f5f3' },
  1000:   { bg: 'linear-gradient(135deg,#d4722a,#a84e10)', text: '#fff0e0' },
  5000:   { bg: 'linear-gradient(135deg,#9070c0,#5e4488)', text: '#f0eaff' },
  10000:  { bg: 'linear-gradient(135deg,#90a030,#5e6e18)', text: '#f0f5d0' },
  25000:  { bg: 'linear-gradient(135deg,#cc2828,#8a1010)', text: '#fff0f0' },
  50000:  { bg: 'linear-gradient(135deg,#e4d8b0,#b8aa7a)', text: '#2a2010' },
  130000: { bg: 'linear-gradient(135deg,#3d8a3d,#1a4d1a)', text: '#e8f5e8' },
};

const NOTE_CARD_ASPECT = '2.2 / 1';
const NOTE_IMAGE_PADDING = 2;

function FallbackNote({ value, label }: { value: number; label: string }) {
  const c = NOTE_COLORS[value] ?? { bg: '#334155', text: '#fff' };
  return (
    <div style={{ width: '100%', height: '100%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 10, fontWeight: 900, fontFamily: 'monospace', color: c.text }}>{label}</span>
    </div>
  );
}

// ─── NoteButton ───────────────────────────────────────────────────────────────

function NoteButton({ denom, count, onClick }: { denom: typeof DENOMS[number]; count: number; onClick: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 100);
    onClick();
  };

  return (
    // Outer wrapper: grid cell context for badge positioning + label layout
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      {/* Quantity badge */}
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -4, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 16, width: 16, borderRadius: '50%',
          fontSize: 7, fontWeight: 900, color: '#fff',
          background: 'linear-gradient(135deg,#16A34A,#22C55E)',
          border: '1.5px solid #fff',
          boxShadow: '0 2px 5px rgba(22,163,74,0.55)',
        }}>
          {count}
        </span>
      )}

      {/* Image card button — fixed aspect-ratio so every card is identical */}
      <button
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          /* Enforce the same dimensions for every card */
          width: '100%',
          aspectRatio: NOTE_CARD_ASPECT,
          padding: NOTE_IMAGE_PADDING,
          boxSizing: 'border-box',
          background: '#fff',
          border: 'none',
          borderRadius: 5,
          overflow: 'hidden',
          cursor: 'pointer',
          outline: 'none',
          userSelect: 'none',
          boxShadow: count > 0
            ? '0 0 0 2px #16A34A, 0 2px 8px rgba(0,0,0,0.2)'
            : '0 1px 4px rgba(0,0,0,0.15)',
          filter: pressed ? 'brightness(0.82)' : count > 0 ? 'brightness(1.06) saturate(1.1)' : 'brightness(1)',
          transform: pressed ? 'scale(0.91)' : 'scale(1)',
          transition: 'transform 0.09s cubic-bezier(0.34,1.56,0.64,1), filter 0.09s ease, box-shadow 0.15s ease',
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
          <FallbackNote value={denom.value} label={denom.label} />
        )}
      </button>

      {/* Label — outside the aspect-ratio button so it never affects card height */}
      <span style={{
        marginTop: 2,
        fontSize: 8,
        fontWeight: 700,
        fontFamily: 'monospace',
        lineHeight: 1,
        textAlign: 'center',
        color: denom.currency === 'USD' ? '#16A34A' : count > 0 ? '#16A34A' : '#6B7280',
      }}>
        {denom.label} <span style={{ fontWeight: 400, fontSize: 7, color: '#9CA3AF' }}>{denom.currency}</span>
      </span>
    </div>
  );
}

// ─── Main InlineCashPanel ─────────────────────────────────────────────────────

export function InlineCashPanel({ saleTotal, lang, onConfirm, onBack }: InlineCashPanelProps) {
  const t = TX[lang];

  // Banknote stack (denomination-based)
  const [noteStack, setNoteStack] = useState<DenomValue[]>([]);

  // Keypad input string (overrides banknotes when non-empty)
  const [keypadStr, setKeypadStr] = useState('');
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // ── Derived totals ──
  // If keypad has input, use that as received; otherwise sum banknotes
  const keypadAmount = useMemo(() => {
    const n = parseInt(keypadStr || '0', 10);
    return isNaN(n) ? 0 : n;
  }, [keypadStr]);

  const noteAmount = useMemo(() => noteStack.reduce((s, n) => s + n, 0), [noteStack]);

  // Keypad takes priority when it has any input
  const received    = keypadStr !== '' ? keypadAmount : noteAmount;
  const isFullyPaid = received >= saleTotal;
  const changeDue   = Math.max(0, received - saleTotal);
  const remaining   = Math.max(0, saleTotal - received);

  const noteBreakdown = useMemo((): NoteEntry[] => {
    if (keypadStr !== '') {
      // When using keypad, represent as a single entry
      return received > 0 ? [{ denomination: received, quantity: 1 }] : [];
    }
    const map: Partial<Record<DenomValue, number>> = {};
    for (const n of noteStack) map[n] = (map[n] ?? 0) + 1;
    return DENOMS
      .filter(d => (map[d.value] ?? 0) > 0)
      .map(d => ({ denomination: d.value, quantity: map[d.value]! }))
      .sort((a, b) => b.denomination - a.denomination);
  }, [noteStack, keypadStr, received]);

  // ── Note actions ──
  const addNote = useCallback((v: DenomValue) => {
    setKeypadStr(''); // Clear keypad when tapping notes
    setNoteStack(p => [...p, v]);
  }, []);

  // ── Keypad actions ──
  const handleKey = useCallback((key: KeyValue) => {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 120);

    if (key === 'C') {
      setKeypadStr('');
      setNoteStack([]);
      return;
    }
    if (key === '+' || key === '-' || key === '×' || key === '÷') return;

    if (key === '00') {
      setKeypadStr(prev => (prev === '' ? '' : prev + '00'));
      return;
    }
    setKeypadStr(prev => {
      const next = prev + key;
      if (parseInt(next, 10) > 999_999_999) return prev;
      return next;
    });
  }, []);

  // ── Backspace ──
  const handleBackspace = useCallback(() => {
    setPressedKey('⌫');
    setTimeout(() => setPressedKey(null), 120);
    if (keypadStr !== '') {
      setKeypadStr(prev => prev.slice(0, -1));
    } else {
      setNoteStack(p => p.slice(0, -1));
    }
  }, [keypadStr]);

  // ── Shared actions ──
  const handleClearAll = useCallback(() => {
    setNoteStack([]);
    setKeypadStr('');
  }, []);

  const handleUndoLast = useCallback(() => {
    if (keypadStr !== '') {
      setKeypadStr(prev => prev.slice(0, -1));
    } else {
      setNoteStack(p => p.slice(0, -1));
    }
  }, [keypadStr]);

  const handleExact = useCallback(() => {
    setNoteStack([]);
    setKeypadStr(String(saleTotal));
  }, [saleTotal]);

  const handleConfirm = useCallback(() => {
    if (!isFullyPaid) return;
    onConfirm(received, changeDue, noteBreakdown);
    setNoteStack([]);
    setKeypadStr('');
  }, [isFullyPaid, received, changeDue, noteBreakdown, onConfirm]);

  // ── Hardware keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key as KeyValue);
      else if (e.key === 'Backspace') handleUndoLast();
      else if (e.key === 'Delete') handleClearAll();
      else if (e.key === 'Enter' && isFullyPaid) handleConfirm();
      else if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey, handleUndoLast, handleClearAll, handleConfirm, isFullyPaid, onBack]);

  const displayValue = keypadStr !== ''
    ? parseInt(keypadStr, 10).toLocaleString('en')
    : '';

  // ── Key style helper ──
  const keyBtnStyle = (type: 'digit'|'op'|'clear'|'back'|'ok', isPressed: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 8, border: '1.5px solid',
      cursor: 'pointer', userSelect: 'none', outline: 'none',
      transition: 'all 0.09s ease',
      transform: isPressed ? 'scale(0.88)' : 'scale(1)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      fontWeight: 700, fontSize: 16, lineHeight: 1,
    };
    switch (type) {
      case 'digit': return { ...base, background: isPressed ? '#e2e8f0' : '#ffffff', borderColor: '#E2E8F0', color: '#1E293B', boxShadow: isPressed ? 'none' : '0 2px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)', fontSize: 17 };
      case 'op':    return { ...base, background: isPressed ? '#dbeafe' : '#EFF6FF', borderColor: '#BFDBFE', color: '#1D4ED8', fontSize: 17, boxShadow: isPressed ? 'none' : '0 1px 3px rgba(59,130,246,0.12)' };
      case 'clear': return { ...base, background: isPressed ? '#fca5a5' : '#FEF2F2', borderColor: '#FECACA', color: '#DC2626', fontSize: 13, fontWeight: 800, letterSpacing: '0.05em', boxShadow: isPressed ? 'none' : '0 1px 3px rgba(220,38,38,0.10)' };
      case 'back':  return { ...base, background: isPressed ? '#fde68a' : '#FFFBEB', borderColor: '#FDE68A', color: '#92400E', fontSize: 17, boxShadow: isPressed ? 'none' : '0 1px 3px rgba(180,83,9,0.10)' };
      case 'ok':    return { ...base }; // OK uses its own inline style
    }
  };

  // ── Shared key button renderer ──
  const KBtn = ({ label, type, onClick, span }: { label: string; type: 'digit'|'op'|'clear'|'back'|'ok'; onClick: () => void; span?: number }) => {
    const isP = pressedKey === label;
    return (
      <button
        onClick={onClick}
        style={{
          ...keyBtnStyle(type, isP),
          gridColumn: span ? `span ${span}` : undefined,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      borderTop: `2px solid ${isFullyPaid ? '#16A34A' : '#E5E7EB'}`,
      transition: 'border-color 0.3s',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      maxHeight: '100%',
      minHeight: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>

      {/* ══ HEADER ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 10px',
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        flexShrink: 0,
      }}>
        <button
          id="cash-panel-back"
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 700, color: '#6B7280',
            padding: '2px 6px', borderRadius: 5,
          }}
        >
          {t.back}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>💱</span>
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#16A34A' }}>
            {t.cashPayment}
          </span>
        </div>

        <span style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic' }}>
          {t.tapNote}
        </span>
      </div>

      {/* ══ BANKNOTE GRID – 5 cols × 2 rows = 10 slots (8 active + 2 future) ══ */}
      <div style={{
        padding: '6px 8px 5px',
        background: '#F9FAFB',
        borderBottom: '2px solid #E5E7EB',
        flexShrink: 0,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, alignItems: 'start', justifyItems: 'stretch' }}>
          {DENOMS.map(denom => (
            <NoteButton
              key={denom.value}
              denom={denom}
              count={noteStack.filter(n => n === denom.value).length}
              onClick={() => addNote(denom.value)}
            />
          ))}

        </div>
      </div>

      {/* ══ MAIN SECTION: Summary (left) + Keypad (right) ══ */}
      <div style={{ display: 'flex', background: '#fff', flexShrink: 0 }}>

        {/* ── LEFT: Payment summary + 3 action buttons ── */}
        <div style={{
          flex: '0 0 44%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #E5E7EB',
        }}>

          {/* Sale Total */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#374151', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.saleTotal}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#111827' }}>{formatCurrency(saleTotal)}</span>
          </div>

          {/* Received */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#374151', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.received}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: received === 0 ? '#9CA3AF' : isFullyPaid ? '#16A34A' : '#D97706', transition: 'color 0.25s' }}>
              {formatCurrency(received)}
            </span>
          </div>

          {/* Change Due / Remaining */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: isFullyPaid ? '#F0FDF4' : 'transparent', transition: 'background 0.25s' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: isFullyPaid ? '#16A34A' : '#DC2626', transition: 'color 0.25s' }}>{t.changeDue}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: isFullyPaid ? '#16A34A' : '#DC2626', transition: 'color 0.25s' }}>
              {formatCurrency(isFullyPaid ? changeDue : remaining)}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#E5E7EB', margin: '2px 0' }} />

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, padding: '4px 8px 5px' }}>
            <button id="cash-panel-clear" onClick={handleClearAll} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '6px 4px', borderRadius: 8,
              border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626',
              fontSize: 9, fontWeight: 800, cursor: 'pointer',
              letterSpacing: '0.03em', textTransform: 'uppercase',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              opacity: (noteStack.length === 0 && keypadStr === '') ? 0.35 : 1,
              transition: 'opacity 0.2s',
            }}>
              <span style={{ fontSize: 11 }}>🗑</span>{t.clear}
            </button>
            <button id="cash-panel-undo" onClick={handleUndoLast} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '6px 4px', borderRadius: 8,
              border: '1.5px solid #FCD34D', background: '#FFFBEB', color: '#B45309',
              fontSize: 9, fontWeight: 800, cursor: 'pointer',
              letterSpacing: '0.03em', textTransform: 'uppercase',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              opacity: (noteStack.length === 0 && keypadStr === '') ? 0.35 : 1,
              transition: 'opacity 0.2s',
            }}>
              <span style={{ fontSize: 11 }}>↩</span>{t.undoLast}
            </button>
            <button id="cash-panel-exact" onClick={handleExact} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '6px 4px', borderRadius: 8,
              border: '1.5px solid #93C5FD', background: '#EFF6FF', color: '#1D4ED8',
              fontSize: 9, fontWeight: 800, cursor: 'pointer',
              letterSpacing: '0.03em', textTransform: 'uppercase',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              transition: 'background 0.15s',
            }}>
              <span style={{ fontSize: 11 }}>⚡</span>{t.exact}
            </button>
          </div>

          {/* Confirm Payment button (full width inside left panel) */}
          <button
            id="cash-panel-confirm"
            onClick={handleConfirm}
            disabled={!isFullyPaid}
            style={{
              margin: '0 8px 6px',
              padding: '8px 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              fontSize: 10.5, fontWeight: 900,
              letterSpacing: '0.07em', textTransform: 'uppercase',
              border: 'none', borderRadius: 10,
              cursor: isFullyPaid ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              background: isFullyPaid
                ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 60%, #16a34a 100%)'
                : '#F3F4F6',
              color: isFullyPaid ? '#ffffff' : '#9CA3AF',
              boxShadow: isFullyPaid ? '0 3px 12px rgba(22,163,74,0.30)' : 'none',
            }}
          >
            {isFullyPaid && <span style={{ fontSize: 14, lineHeight: 1 }}>✓</span>}
            <span>{t.confirmPay}</span>
            {isFullyPaid && (
              <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.88, fontFamily: 'monospace', textTransform: 'none', letterSpacing: 0 }}>
                ({formatCurrency(changeDue)} {t.change})
              </span>
            )}
          </button>
        </div>

        {/* ── RIGHT: POS Keypad ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '5px 6px 6px',
          gap: 3,
          background: '#fff',
          minWidth: 0,
        }}>

          {/* Amount display — full width above keypad */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
            border: '1.5px solid #E2E8F0',
            borderRadius: 8,
            padding: '5px 10px',
            minHeight: 28,
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 14,
              color: displayValue ? '#111827' : '#94A3B8',
              fontFamily: 'monospace',
              fontWeight: displayValue ? 700 : 400,
              fontStyle: displayValue ? 'normal' : 'italic',
              letterSpacing: displayValue ? '0.02em' : 0,
              flex: 1,
              textAlign: 'right',
              paddingRight: 8,
            }}>
              {displayValue || t.enterAmount}
            </span>
            <span style={{
              fontSize: 9,
              fontWeight: 800,
              color: '#475569',
              background: '#E2E8F0',
              borderRadius: 5,
              padding: '2px 7px',
              letterSpacing: '0.07em',
              flexShrink: 0,
            }}>
              {t.currency}
            </span>
          </div>

          {/*
            POS Keypad — 4-col × 5-row CSS grid
            Cols 1–3 = digits | Col 4 = operators (rows 1–4) + OK (row 5)
            Row 5 is taller (1.7fr) to give OK a larger touch target.
            ┌─────┬─────┬─────┬──────┐
            │  7  │  8  │  9  │  ÷   │  row 1  (1fr)
            ├─────┼─────┼─────┼──────┤
            │  4  │  5  │  6  │  ×   │  row 2  (1fr)
            ├─────┼─────┼─────┼──────┤
            │  1  │  2  │  3  │  −   │  row 3  (1fr)
            ├─────┼─────┼─────┼──────┤
            │  C  │  0  │  00 │  +   │  row 4  (1fr)
            ├─────┴─────┴─────┼──────┤
            │    ⌫  (span 3)  │  OK  │  row 5  (1.7fr)
            └─────────────────┴──────┘
          */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr) 46px',
            gridTemplateRows: 'repeat(4, 1fr) 1.7fr',
            gap: 3,
            flex: 1,
            minHeight: 0,
          }}>

            {/* ── Row 1: 7  8  9  ÷ ── */}
            {(['7','8','9'] as const).map(d => (
              <button key={d} onClick={() => handleKey(d as KeyValue)}
                style={keyBtnStyle('digit', pressedKey === d)}>
                {d}
              </button>
            ))}
            <button onClick={() => handleKey('÷')}
              style={keyBtnStyle('op', pressedKey === '÷')}>
              ÷
            </button>

            {/* ── Row 2: 4  5  6  × ── */}
            {(['4','5','6'] as const).map(d => (
              <button key={d} onClick={() => handleKey(d as KeyValue)}
                style={keyBtnStyle('digit', pressedKey === d)}>
                {d}
              </button>
            ))}
            <button onClick={() => handleKey('×')}
              style={keyBtnStyle('op', pressedKey === '×')}>
              ×
            </button>

            {/* ── Row 3: 1  2  3  − ── */}
            {(['1','2','3'] as const).map(d => (
              <button key={d} onClick={() => handleKey(d as KeyValue)}
                style={keyBtnStyle('digit', pressedKey === d)}>
                {d}
              </button>
            ))}
            <button onClick={() => handleKey('-')}
              style={keyBtnStyle('op', pressedKey === '−')}>
              −
            </button>

            {/* ── Row 4: C  0  00  + ── */}
            <button id="cash-keypad-c" onClick={() => handleKey('C')}
              style={keyBtnStyle('clear', pressedKey === 'C')}>
              C
            </button>
            <button onClick={() => handleKey('0')}
              style={keyBtnStyle('digit', pressedKey === '0')}>
              0
            </button>
            <button onClick={() => handleKey('00')}
              style={keyBtnStyle('digit', pressedKey === '00')}>
              00
            </button>
            <button onClick={() => handleKey('+')}
              style={keyBtnStyle('op', pressedKey === '+')}>
              +
            </button>

            {/* ── Row 5: ⌫ (cols 1-3)  +  OK (col 4, taller row) ── */}
            <button onClick={handleBackspace}
              style={{
                ...keyBtnStyle('back', pressedKey === '⌫'),
                gridColumn: '1 / 4',
              }}>
              ⌫
            </button>

            {/* OK — sits in the tall row 5 col 4, visually prominent */}
            <button
              id="cash-keypad-ok"
              onClick={handleConfirm}
              disabled={!isFullyPaid}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
                borderRadius: 8,
                border: '1.5px solid',
                cursor: isFullyPaid ? 'pointer' : 'not-allowed',
                userSelect: 'none',
                outline: 'none',
                transition: 'all 0.1s ease',
                transform: pressedKey === 'OK' ? 'scale(0.88)' : 'scale(1)',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: '0.05em',
                lineHeight: 1,
                background: isFullyPaid
                  ? 'linear-gradient(170deg, #22c55e 0%, #16a34a 55%, #15803d 100%)'
                  : '#F1F5F9',
                borderColor: isFullyPaid ? '#16a34a' : '#CBD5E1',
                color: isFullyPaid ? '#fff' : '#94A3B8',
                boxShadow: isFullyPaid
                  ? '0 3px 12px rgba(22,163,74,0.40), inset 0 1px 0 rgba(255,255,255,0.25)'
                  : 'none',
              }}
            >
              {isFullyPaid ? (
                <>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
                  <span>OK</span>
                </>
              ) : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
