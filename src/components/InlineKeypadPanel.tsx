/**
 * InlineKeypadPanel — Odoo-style POS Cash Payment with Numeric Keypad
 *
 * Matches the reference design:
 *   • Left: Sale Total / Received / Change Due labels + values
 *   • Middle: Clear All / Undo Last / Exact action buttons
 *   • Right: 4×4 numeric keypad (7–9 +, 4–6 -, 1–3 ×, C 0 00 ÷)
 *   • Bottom: Full-width green "Confirm Payment" bar
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { formatCurrency } from '../lib/format.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NoteEntry {
  denomination: number;
  quantity: number;
}

export interface InlineKeypadPanelProps {
  saleTotal: number;
  lang?: 'en' | 'ku';
  onConfirm: (received: number, change: number, notes: NoteEntry[]) => void;
  onBack?: () => void;
}

// ─── Translations ─────────────────────────────────────────────────────────────

const TX = {
  en: {
    saleTotal: 'SALE TOTAL',
    received: 'RECEIVED',
    changeDue: 'CHANGE DUE',
    enterAmount: 'Enter amount',
    currency: 'IQD',
    clearAll: 'Clear All',
    undoLast: 'Undo Last',
    exact: 'Exact',
    confirmPayment: 'CONFIRM PAYMENT',
    change: 'change',
  },
  ku: {
    saleTotal: 'کۆی فرۆشتن',
    received: 'وەرگیراو',
    changeDue: 'باقی',
    enterAmount: 'بڕی پارە بنووسە',
    currency: 'د.ع',
    clearAll: 'پاکردنەوە',
    undoLast: 'سڕینی دوایی',
    exact: 'تەواو',
    confirmPayment: 'پەسەندکردنی پارەدان',
    change: 'باقی',
  },
} as const;

// ─── Keypad layout ────────────────────────────────────────────────────────────

const KEYPAD_ROWS = [
  ['7', '8', '9', '+'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '×'],
  ['C', '0', '00', '÷'],
] as const;

type KeyValue = typeof KEYPAD_ROWS[number][number];

// ─── Helper ───────────────────────────────────────────────────────────────────

function isOperator(k: KeyValue) {
  return k === '+' || k === '-' || k === '×' || k === '÷';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InlineKeypadPanel({
  saleTotal,
  lang = 'en',
  onConfirm,
  onBack,
}: InlineKeypadPanelProps) {
  const t = TX[lang];

  // Raw digit string entered via keypad (e.g. "10000")
  const [inputStr, setInputStr] = useState('');
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // Derived numeric value from input
  const received = useMemo(() => {
    const n = parseInt(inputStr || '0', 10);
    return isNaN(n) ? 0 : n;
  }, [inputStr]);

  const isFullyPaid = received >= saleTotal;
  const changeDue   = useMemo(() => Math.max(0, received - saleTotal), [received, saleTotal]);
  const remaining   = useMemo(() => Math.max(0, saleTotal - received), [received, saleTotal]);

  // ── Keyboard hardware support ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key as KeyValue);
      else if (e.key === 'Backspace') handleKey('C');
      else if (e.key === 'Enter' && isFullyPaid) handleConfirm();
      else if (e.key === 'Escape') onBack?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Key press handler ──
  const handleKey = useCallback((key: KeyValue) => {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 120);

    if (key === 'C') {
      // Clear
      setInputStr('');
      return;
    }
    if (isOperator(key)) {
      // For now operators just append the key visually (could extend to calc)
      return;
    }
    if (key === '00') {
      setInputStr(prev => (prev === '' ? '' : prev + '00'));
      return;
    }
    setInputStr(prev => {
      const next = prev + key;
      // Guard against absurdly large numbers
      if (parseInt(next, 10) > 999_999_999) return prev;
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => setInputStr(''), []);
  const handleUndoLast = useCallback(() => setInputStr(prev => prev.slice(0, -1)), []);
  const handleExact    = useCallback(() => setInputStr(String(saleTotal)), [saleTotal]);

  const handleConfirm = useCallback(() => {
    if (!isFullyPaid) return;
    onConfirm(received, changeDue, [
      { denomination: received, quantity: 1 },
    ]);
    setInputStr('');
  }, [isFullyPaid, received, changeDue, onConfirm]);

  // ── Key style helpers ──
  const getKeyStyle = (key: KeyValue): React.CSSProperties => {
    const pressed = pressedKey === key;
    const base: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      fontSize: 18,
      fontWeight: 700,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      cursor: 'pointer',
      userSelect: 'none',
      border: 'none',
      outline: 'none',
      transition: 'all 0.08s ease',
      transform: pressed ? 'scale(0.91)' : 'scale(1)',
      height: 54,
    };

    if (isOperator(key)) {
      return {
        ...base,
        background: pressed ? '#d1d5db' : '#e9ecef',
        color: '#374151',
      };
    }
    if (key === 'C') {
      return {
        ...base,
        background: pressed ? '#dc2626' : '#fee2e2',
        color: '#dc2626',
        fontSize: 14,
        fontWeight: 800,
      };
    }
    return {
      ...base,
      background: pressed ? '#d1d5db' : '#f3f4f6',
      color: '#111827',
    };
  };

  const displayValue = inputStr === '' ? '' : parseInt(inputStr, 10).toLocaleString('en');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Main body: left info + right keypad ── */}
      <div style={{ display: 'flex', minHeight: 0 }}>

        {/* ── LEFT: Sale Totals + Action Buttons ── */}
        <div
          style={{
            flex: '0 0 55%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          {/* Totals table */}
          <div style={{ flex: 1 }}>
            {/* Sale Total */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t.saleTotal}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#111827' }}>
                {formatCurrency(saleTotal)}
              </span>
            </div>

            {/* Received */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t.received}
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  fontWeight: 800,
                  color: received === 0 ? '#9ca3af' : isFullyPaid ? '#16a34a' : '#d97706',
                  transition: 'color 0.25s',
                }}
              >
                {formatCurrency(received)}
              </span>
            </div>

            {/* Change Due / Remaining */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid #f3f4f6',
                background: isFullyPaid ? '#f0fdf4' : 'transparent',
                transition: 'background 0.25s',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: isFullyPaid ? '#16a34a' : '#dc2626',
                  transition: 'color 0.25s',
                }}
              >
                {t.changeDue}
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  fontWeight: 800,
                  color: isFullyPaid ? '#16a34a' : '#dc2626',
                  transition: 'color 0.25s',
                }}
              >
                {formatCurrency(isFullyPaid ? changeDue : remaining)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 6,
              padding: '8px 10px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
            }}
          >
            {/* Clear All */}
            <button
              id="keypad-clear-all"
              onClick={handleClearAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '7px 4px',
                borderRadius: 8,
                border: '1.5px solid #fca5a5',
                background: '#fff5f5',
                color: '#dc2626',
                fontSize: 9,
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fff5f5';
              }}
            >
              <span style={{ fontSize: 11 }}>🗑</span>
              {t.clearAll}
            </button>

            {/* Undo Last */}
            <button
              id="keypad-undo-last"
              onClick={handleUndoLast}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '7px 4px',
                borderRadius: 8,
                border: '1.5px solid #fcd34d',
                background: '#fffbeb',
                color: '#b45309',
                fontSize: 9,
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fef3c7';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fffbeb';
              }}
            >
              <span style={{ fontSize: 11 }}>↩</span>
              {t.undoLast}
            </button>

            {/* Exact */}
            <button
              id="keypad-exact"
              onClick={handleExact}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '7px 4px',
                borderRadius: 8,
                border: '1.5px solid #93c5fd',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: 9,
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#dbeafe';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff';
              }}
            >
              <span style={{ fontSize: 11 }}>⚡</span>
              {t.exact}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Numeric Keypad ── */}
        <div
          style={{
            flex: '0 0 45%',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px',
            gap: 6,
            background: '#fff',
          }}
        >
          {/* Amount display row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 10px',
              minHeight: 36,
            }}
          >
            <span style={{ fontSize: 13, color: '#9ca3af', fontStyle: displayValue ? 'normal' : 'italic' }}>
              {displayValue || t.enterAmount}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#374151',
                letterSpacing: '0.06em',
                background: '#e5e7eb',
                borderRadius: 5,
                padding: '2px 7px',
              }}
            >
              {t.currency}
            </span>
          </div>

          {/* Keypad grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 5,
            }}
          >
            {KEYPAD_ROWS.map((row) =>
              row.map((key) => (
                <button
                  key={key}
                  id={`keypad-key-${key}`}
                  onClick={() => handleKey(key)}
                  style={getKeyStyle(key)}
                >
                  {key}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Confirm Payment bar ── */}
      <button
        id="keypad-confirm-payment"
        onClick={handleConfirm}
        disabled={!isFullyPaid}
        style={{
          width: '100%',
          padding: '13px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: 'none',
          borderRadius: 0,
          cursor: isFullyPaid ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          background: isFullyPaid
            ? 'linear-gradient(90deg, #16a34a 0%, #22c55e 50%, #16a34a 100%)'
            : '#e5e7eb',
          color: isFullyPaid ? '#ffffff' : '#9ca3af',
          boxShadow: isFullyPaid ? '0 -2px 12px rgba(22,163,74,0.2)' : 'none',
        }}
      >
        {isFullyPaid && (
          <span style={{ fontSize: 16, lineHeight: 1 }}>✓</span>
        )}
        <span>{t.confirmPayment}</span>
        {isFullyPaid && changeDue > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              opacity: 0.85,
              fontFamily: 'monospace',
              textTransform: 'none',
              letterSpacing: '0',
            }}
          >
            ({formatCurrency(changeDue)} {t.change})
          </span>
        )}
      </button>
    </div>
  );
}
