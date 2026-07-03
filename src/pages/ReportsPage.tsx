import { useState, useEffect, useMemo } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import { formatCurrency, formatDate } from '../lib/format.js';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#FFFFFF', pageBg: '#F8F9FA', card: '#FFFFFF',
  border: '#E5E7EB', borderLight: '#F3F4F6',
  text: '#111827', sub: '#374151', muted: '#6B7280', mutedLight: '#9CA3AF',
  green: '#16A34A', greenBg: '#F0FDF4', greenBorder: '#BBF7D0', greenLight: '#DCFCE7',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FECACA',
  amber: '#D97706', amberBg: '#FFFBEB',
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
  violet: '#7C3AED',
  shadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.10)',
};

// ─── Nav sections ──────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'dashboard',  icon: '📊', label: 'Dashboard',           desc: 'KPI overview' },
  { id: 'sales',      icon: '🧾', label: 'Sales Report',        desc: 'Sales breakdown' },
  { id: 'zreports',   icon: '📋', label: 'Z-Reports',           desc: 'End-of-day reports' },
  { id: 'xreport',    icon: '⚡', label: 'X-Report',            desc: 'Current shift live' },
  { id: 'payment',    icon: '💳', label: 'Payment Report',      desc: 'Payment methods' },
  { id: 'inventory',  icon: '📦', label: 'Inventory Report',    desc: 'Stock levels' },
  { id: 'products',   icon: '🏷️', label: 'Product Performance', desc: 'Best/worst sellers' },
  { id: 'customers',  icon: '👥', label: 'Customer Report',     desc: 'Customer analytics' },
  { id: 'employees',  icon: '👤', label: 'Employee Report',     desc: 'Cashier performance' },
  { id: 'tax',        icon: '🧮', label: 'Tax Report',          desc: 'Tax collected' },
  { id: 'drawer',     icon: '🗃️', label: 'Cash Drawer',         desc: 'Drawer sessions' },
  { id: 'audit',      icon: '🔍', label: 'Audit Log',           desc: 'Activity trail' },
];

// ─── Types ─────────────────────────────────────────────────────────────────────
type Filters = { from: string; to: string; cashierId: string; paymentMethod: string };
type Preset  = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
type ColDef  = { key: string; label: string; align?: 'left'|'right'|'center'; render?: (row: Record<string,unknown>, i: number) => React.ReactNode };

// ─── Date helpers ──────────────────────────────────────────────────────────────
const today      = () => new Date().toISOString().slice(0,10);
const daysAgo    = (n:number) => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };
const monthStart = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };
const yearStart  = () => `${new Date().getFullYear()}-01-01`;

function presetRange(p: Preset): { from: string; to: string } {
  const t = today();
  if (p === 'today')     return { from: t, to: t };
  if (p === 'yesterday') { const y = daysAgo(1); return { from: y, to: y }; }
  if (p === 'week')      return { from: daysAgo(6), to: t };
  if (p === 'month')     return { from: monthStart(), to: t };
  if (p === 'year')      return { from: yearStart(), to: t };
  return { from: daysAgo(29), to: t };
}

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ data, height = 140, color = C.green }: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  if (!data.length) return (
    <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', color: C.mutedLight, fontSize:12 }}>
      No data for this period
    </div>
  );
  const max = Math.max(...data.map(d => d.value), 1);
  const n   = data.length;
  const W   = Math.max(n * 28, 320);
  const bw  = Math.max(6, (W / n) - 8);
  return (
    <div style={{ overflowX:'auto' }}>
      <svg width={W} height={height + 20} style={{ display:'block' }}>
        {data.map((d, i) => {
          const bh = Math.max(2, (d.value / max) * height);
          const x  = i * (W / n) + (W / n - bw) / 2;
          const y  = height - bh;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw} height={bh} fill={color} rx={3} opacity={0.85} />
              <text x={x + bw/2} y={height + 14} textAnchor="middle" fontSize={9} fill={C.mutedLight}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── SVG Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120 }: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) return (
    <div style={{ width:size, height:size, borderRadius:'50%', background: C.borderLight,
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color: C.mutedLight }}>
      No data
    </div>
  );
  const cx = size/2, cy = size/2, r = size*0.38, ir = size*0.24;
  let angle = -90;
  const arcs = segments.map(seg => {
    const sweep = (seg.value / total) * 360;
    const sa = angle; angle += sweep; const ea = angle;
    const rad = (a:number) => (a * Math.PI) / 180;
    const [x1,y1] = [cx + r*Math.cos(rad(sa)), cy + r*Math.sin(rad(sa))];
    const [x2,y2] = [cx + r*Math.cos(rad(ea)), cy + r*Math.sin(rad(ea))];
    const [x3,y3] = [cx + ir*Math.cos(rad(ea)), cy + ir*Math.sin(rad(ea))];
    const [x4,y4] = [cx + ir*Math.cos(rad(sa)), cy + ir*Math.sin(rad(sa))];
    const lg = sweep > 180 ? 1 : 0;
    return { d:`M${x1},${y1}A${r},${r},0,${lg},1,${x2},${y2}L${x3},${y3}A${ir},${ir},0,${lg},0,${x4},${y4}Z`, color: seg.color };
  });
  return (
    <svg width={size} height={size}>
      {arcs.map((arc, i) => <path key={i} d={arc.d} fill={arc.color} />)}
    </svg>
  );
}

// ─── UI Primitives ─────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color = C.green }: {
  icon: string; label: string; value: string|number; sub?: string; color?: string;
}) {
  return (
    <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:12,
      padding:'18px 20px', boxShadow: C.shadow }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:600, color: C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>
          {label}
        </div>
        <div style={{ width:34, height:34, borderRadius:9, background:`${color}15`,
          border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize:22, fontWeight:800, color: C.text, letterSpacing:'-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color: C.mutedLight, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ label, type }: { label: string; type: 'green'|'red'|'amber'|'blue'|'gray' }) {
  const s = {
    green: { bg: C.greenBg,   color: C.green,  border: C.greenBorder },
    red:   { bg: C.redBg,     color: C.red,     border: C.redBorder   },
    amber: { bg: C.amberBg,   color: C.amber,   border: '#FDE68A'     },
    blue:  { bg: C.blueBg,    color: C.blue,    border: C.blueBorder  },
    gray:  { bg: C.borderLight,color: C.muted,  border: C.border      },
  }[type];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px',
      borderRadius:6, fontSize:11, fontWeight:700,
      background: s.bg, color: s.color, border:`1px solid ${s.border}` }}>
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      padding:'60px 0', flexDirection:'column', gap:14 }}>
      <div style={{ width:32, height:32, border:`3px solid ${C.borderLight}`,
        borderTop:`3px solid ${C.green}`, borderRadius:'50%',
        animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13, color: C.muted }}>Loading report data…</div>
    </div>
  );
}

function SectionWrap({ title, icon, subtitle, action, children, noPad }: {
  title: string; icon: string; subtitle?: string;
  action?: React.ReactNode; children: React.ReactNode; noPad?: boolean;
}) {
  return (
    <div style={{ background: C.card, border:`1px solid ${C.border}`,
      borderRadius:12, boxShadow: C.shadow, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 20px', borderBottom:`1px solid ${C.borderLight}`, background:'#FAFBFC' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background: C.greenBg,
            border:`1px solid ${C.greenBorder}`, display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:16 }}>{icon}</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color: C.text }}>{title}</div>
            {subtitle && <div style={{ fontSize:11, color: C.muted, marginTop:1 }}>{subtitle}</div>}
          </div>
        </div>
        {action && <div style={{ display:'flex', gap:8 }}>{action}</div>}
      </div>
      <div style={{ padding: noPad ? 0 : 20 }}>{children}</div>
    </div>
  );
}

function ExportBar({ from, to }: { from?: string; to?: string }) {
  const qs = from ? `&from=${from}&to=${to}` : '';
  return (
    <div style={{ display:'flex', gap:8 }}>
      <a href={apiUrl(`/reports/export?format=excel${qs}`)} target="_blank" rel="noreferrer"
        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 13px',
          borderRadius:8, border:`1px solid ${C.border}`, background:'#F9FAFB',
          color: C.sub, fontSize:12, fontWeight:600, textDecoration:'none', cursor:'pointer' }}>
        📥 Excel
      </a>
      <a href={apiUrl(`/reports/export?format=pdf${qs}`)} target="_blank" rel="noreferrer"
        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 13px',
          borderRadius:8, border:`1px solid ${C.border}`, background:'#F9FAFB',
          color: C.sub, fontSize:12, fontWeight:600, textDecoration:'none', cursor:'pointer' }}>
        📄 PDF
      </a>
    </div>
  );
}

// ─── Sortable/Paginated Table ──────────────────────────────────────────────────
function Table({ cols, rows, keyFn, emptyMsg, perPage = 20 }: {
  cols: ColDef[]; rows: Record<string,unknown>[];
  keyFn: (row: Record<string,unknown>, i:number) => string;
  emptyMsg?: string; perPage?: number;
}) {
  const [sortCol, setSortCol] = useState<string|null>(null);
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [page, setPage]       = useState(1);

  const sorted = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paged      = sorted.slice((page-1)*perPage, page*perPage);

  const toggleSort = (key: string) => {
    if (sortCol === key) setSortDir(d => d==='asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('desc'); }
    setPage(1);
  };

  if (!rows.length) return (
    <div style={{ padding:'36px 0', textAlign:'center', color: C.mutedLight, fontSize:13 }}>
      {emptyMsg || 'No data available for this period.'}
    </div>
  );

  return (
    <>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`2px solid ${C.border}` }}>
              {cols.map(col => (
                <th key={col.key} onClick={() => toggleSort(col.key)}
                  style={{ padding:'10px 12px', textAlign: col.align||'left',
                    fontWeight:700, color: C.sub, fontSize:11,
                    textTransform:'uppercase', letterSpacing:'0.05em',
                    cursor:'pointer', userSelect:'none', whiteSpace:'nowrap',
                    background:'#FAFBFC', borderBottom:`2px solid ${C.border}` }}>
                  {col.label}{' '}
                  <span style={{ color: sortCol===col.key ? C.green : C.borderLight }}>
                    {sortCol===col.key ? (sortDir==='asc' ? '↑' : '↓') : '↕'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={keyFn(row, i)}
                style={{ borderBottom:`1px solid ${C.borderLight}`, transition:'background 0.1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FAFBFC'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                {cols.map(col => (
                  <td key={col.key}
                    style={{ padding:'10px 12px', textAlign: col.align||'left',
                      color: C.sub, verticalAlign:'middle' }}>
                    {col.render
                      ? col.render(row, (page-1)*perPage + i)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 0 0', marginTop:4, borderTop:`1px solid ${C.borderLight}` }}>
          <div style={{ fontSize:12, color: C.muted }}>
            Showing {(page-1)*perPage+1}–{Math.min(page*perPage, sorted.length)} of {sorted.length}
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {[...Array(Math.min(totalPages, 8))].map((_, i) => {
              const p = i+1;
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width:28, height:28, borderRadius:6,
                    border:`1px solid ${page===p ? C.green : C.border}`,
                    background: page===p ? C.greenBg : 'transparent',
                    color: page===p ? C.green : C.muted,
                    fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Z-Report Detail Modal ─────────────────────────────────────────────────────
function ZReportModal({ report, onClose }: { report: Record<string,unknown>; onClose: () => void }) {
  const rows: [string, React.ReactNode][] = [
    ['Report #',       String(report.reportNumber)],
    ['Cashier',        String(report.cashier)],
    ['Shift Start',    formatDate(String(report.shiftStart))],
    ['Shift End',      report.shiftEnd ? formatDate(String(report.shiftEnd)) : <Badge label="Open" type="amber" />],
    ['Status',         <Badge label={String(report.status)} type={report.status==='CLOSED' ? 'green' : 'amber'} />],
    ['Total Sales',    <strong>{formatCurrency(report.totalSales as number)}</strong>],
    ['Cash Sales',     formatCurrency(report.cashSales as number)],
    ['Card Sales',     formatCurrency(report.cardSales as number)],
    ['Discounts',      formatCurrency(report.discounts as number)],
    ['Refunds',        <span style={{ color: C.red }}>{formatCurrency(report.totalRefunds as number)}</span>],
    ['Refunds Count',  String(report.refundsCount)],
    ['Voids',          String(report.voidsCount)],
    ['Cash In',        formatCurrency(report.cashIn as number)],
    ['Cash Out',       formatCurrency(report.cashOut as number)],
    ['Opening Float',  formatCurrency(report.openingFloat as number)],
    ['Expected Cash',  formatCurrency(report.expectedCash as number)],
    ['Closing Float',  report.closingFloat != null ? formatCurrency(report.closingFloat as number) : '—'],
    ['Difference',     report.difference != null
      ? <span style={{ color: (report.difference as number)<0 ? C.red : C.green, fontWeight:700 }}>
          {(report.difference as number) >= 0 ? '+' : ''}{formatCurrency(report.difference as number)}
        </span>
      : '—'],
  ];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background: C.bg, borderRadius:16, padding:28, width:500,
        maxHeight:'82vh', overflowY:'auto', boxShadow: C.shadowMd }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800, color: C.text }}>
            Z-Report: {String(report.reportNumber)}
          </h3>
          <button onClick={onClose}
            style={{ border:'none', background:'transparent', fontSize:22, cursor:'pointer', color: C.muted, lineHeight:1 }}>
            ×
          </button>
        </div>
        {rows.map(([label, value]) => (
          <div key={String(label)}
            style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'9px 0', borderBottom:`1px solid ${C.borderLight}`, fontSize:13 }}>
            <span style={{ color: C.muted }}>{label}</span>
            <span style={{ fontWeight:600, color: C.text }}>{value}</span>
          </div>
        ))}
        <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
          <a href={apiUrl('/reports/export?format=pdf')} target="_blank" rel="noreferrer"
            style={{ padding:'8px 18px', borderRadius:8, border:`1px solid ${C.border}`,
              background:'#F9FAFB', color: C.sub, fontSize:13, fontWeight:600, textDecoration:'none' }}>
            🖨️ Print
          </a>
          <button onClick={onClose}
            style={{ padding:'8px 20px', borderRadius:8, border:'none',
              background: C.green, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION: Dashboard ────────────────────────────────────────────────────────
function DashboardSection({ filters }: { filters: Filters }) {
  const [kpis,  setKpis]  = useState<Record<string,unknown>|null>(null);
  const [chart, setChart] = useState<{label:string;value:number}[]>([]);
  const [topProds, setTopProds] = useState<Record<string,unknown>[]>([]);
  const [payData,  setPayData]  = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = `from=${filters.from}&to=${filters.to}`;
    Promise.all([
      apiFetch<Record<string,unknown>>(`/reports/dashboard?${qs}`),
      apiFetch<Record<string,unknown>>(`/reports/sales-detail?${qs}&limit=1`),
      apiFetch<{topProducts:Record<string,unknown>[]}>('/reports/top-products?range=monthly'),
      apiFetch<{payments:Record<string,unknown>[]}>(`/reports/payment-methods?${qs}`),
    ]).then(([dash, detail, top, pay]) => {
      setKpis(dash);
      const byDay = (detail.salesByDay as {date:string;total:number}[]) || [];
      setChart(byDay.map(d => ({ label: d.date.slice(5), value: d.total })));
      setTopProds((top.topProducts || []) as Record<string,unknown>[]);
      setPayData((pay.payments || []) as Record<string,unknown>[]);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [filters.from, filters.to]);

  if (loading) return <LoadingState />;
  if (!kpis) return <div style={{ padding:40, textAlign:'center', color: C.muted }}>Failed to load dashboard.</div>;

  const kpiCards = [
    { icon:'💰', label:'Total Revenue',   value: formatCurrency(kpis.revenue as number), color: C.green },
    { icon:'📈', label:'Total Profit',    value: formatCurrency(kpis.profit as number),  color: '#059669' },
    { icon:'💸', label:'Total Cost',      value: formatCurrency(kpis.cost as number),    color: C.amber  },
    { icon:'🧾', label:'Transactions',    value: (kpis.transactions as number).toLocaleString(), color: C.blue },
    { icon:'📦', label:'Items Sold',      value: (kpis.itemsSold as number).toLocaleString(), color: C.violet },
    { icon:'📊', label:'Avg Sale Value',  value: formatCurrency(kpis.avgSale as number), color: '#0891B2' },
    { icon:'🏷️', label:'Total Discounts', value: formatCurrency(kpis.discounts as number), color: C.amber },
    { icon:'↩️', label:'Total Refunds',   value: formatCurrency(kpis.refunds as number),  color: C.red   },
  ];

  const COLORS = ['#16A34A','#2563EB','#D97706','#7C3AED','#0891B2'];
  const paySegs = payData.map((p, i) => ({
    label: String(p.method), value: p.total as number,
    color: COLORS[i] || '#9CA3AF',
  }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:14 }}>
        {kpiCards.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Charts Row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        <SectionWrap title="Daily Revenue Trend" icon="📈" subtitle="Revenue by day in selected period">
          <BarChart data={chart} height={160} />
        </SectionWrap>

        <SectionWrap title="Payment Distribution" icon="💳" subtitle="By payment method">
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18 }}>
            <DonutChart segments={paySegs} size={130} />
            <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:8 }}>
              {paySegs.map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center',
                  justifyContent:'space-between', fontSize:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background: s.color }} />
                    <span style={{ color: C.sub, fontWeight:600 }}>{s.label}</span>
                  </div>
                  <span style={{ fontWeight:800, color: C.text }}>{formatCurrency(s.value)}</span>
                </div>
              ))}
              {!paySegs.length && <div style={{ fontSize:12, color: C.mutedLight, textAlign:'center' }}>No payment data</div>}
            </div>
          </div>
        </SectionWrap>
      </div>

      {/* Top Products Table */}
      <SectionWrap title="Top Selling Products" icon="🏆" subtitle="Highest quantity in period" action={<ExportBar from={filters.from} to={filters.to} />}>
        <Table
          cols={[
            { key:'_rank', label:'#', render:(_r,i)=><span style={{ fontWeight:700, color: C.mutedLight }}>{i+1}</span> },
            { key:'name',     label:'Product' },
            { key:'sku',      label:'SKU' },
            { key:'quantity', label:'Qty Sold',  align:'right', render:r=><strong>{String(r.quantity)}</strong> },
            { key:'revenue',  label:'Revenue',   align:'right', render:r=>formatCurrency(r.revenue as number) },
          ]}
          rows={topProds}
          keyFn={(r:any) => r.productId}
        />
      </SectionWrap>
    </div>
  );
}

// ─── SECTION: Sales Report ─────────────────────────────────────────────────────
function SalesSection({ filters }: { filters: Filters }) {
  const [data, setData] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = `from=${filters.from}&to=${filters.to}${filters.cashierId?`&cashierId=${filters.cashierId}`:''}${filters.paymentMethod?`&paymentMethod=${filters.paymentMethod}`:''}`;
    apiFetch<Record<string,unknown>>(`/reports/sales-detail?${qs}`)
      .then(setData).catch(()=>{}).finally(()=>setLoading(false));
  }, [filters.from, filters.to, filters.cashierId, filters.paymentMethod]);

  if (loading) return <LoadingState />;
  if (!data)   return null;

  const sales    = (data.sales as Record<string,unknown>[]) || [];
  const byDay    = (data.salesByDay as {date:string;total:number}[]) || [];
  const chartData = byDay.map(d => ({ label: d.date.slice(5), value: d.total }));
  const revenue  = sales.reduce((s,r) => s + Number(r.total),0);
  const discounts = sales.reduce((s,r) => s + Number(r.discountAmount) + Number(r.couponDiscount),0);
  const taxTotal = sales.reduce((s,r) => s + Number(r.taxAmount ?? 0), 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px,1fr))', gap:12 }}>
        <KpiCard icon="💰" label="Revenue"      value={formatCurrency(revenue)} />
        <KpiCard icon="🧾" label="Transactions" value={(data.total as number).toLocaleString()} />
        <KpiCard icon="🏷️" label="Discounts"   value={formatCurrency(discounts)} color={C.amber} />
        <KpiCard icon="🧮" label="Tax"          value={formatCurrency(taxTotal)} color={C.blue} />
      </div>

      <SectionWrap title="Daily Revenue Chart" icon="📈" subtitle="Sales totals by date" action={<ExportBar from={filters.from} to={filters.to} />}>
        <BarChart data={chartData} height={160} />
      </SectionWrap>

      <SectionWrap title="Sales Transactions" icon="🧾" subtitle={`${data.total} total transactions`} noPad>
        <div style={{ padding:'16px 20px' }}>
          <Table
            cols={[
              { key:'receiptNumber', label:'Receipt #', render:r=><span style={{ fontFamily:'monospace', fontWeight:700, color: C.blue, fontSize:12 }}>{String(r.receiptNumber)}</span> },
              { key:'createdAt', label:'Date & Time', render:r=>formatDate(String(r.createdAt)) },
              { key:'_cashier', label:'Cashier', render:r=>(r.user as any)?.name || '—' },
              { key:'_customer', label:'Customer', render:r=>(r.customer as any)?.name || <span style={{ color: C.mutedLight }}>Walk-in</span> },
              { key:'_payment', label:'Payment', render:r=>{
                const pmts = (r.payments as {method:string}[]) || [];
                return pmts.length ? pmts.map(p=>p.method).join(', ') : '—';
              }},
              { key:'total', label:'Total', align:'right', render:r=><strong style={{ color: C.text }}>{formatCurrency(r.total as number)}</strong> },
              { key:'status', label:'Status', render:()=><Badge label="Completed" type="green" /> },
            ]}
            rows={sales}
            keyFn={(r:any) => r.id}
          />
        </div>
      </SectionWrap>
    </div>
  );
}

// ─── SECTION: Z-Reports ────────────────────────────────────────────────────────
function ZReportsSection({ filters }: { filters: Filters }) {
  const [data,     setData]     = useState<Record<string,unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string,unknown>|null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{reports:Record<string,unknown>[]}>(`/reports/z-reports-list?from=${filters.from}&to=${filters.to}`)
      .then(d => setData(d.reports || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, [filters.from, filters.to]);

  if (loading) return <LoadingState />;

  return (
    <>
      <SectionWrap title="Z-Reports" icon="📋"
        subtitle={`${data.length} drawer sessions in selected period`}
        action={<ExportBar from={filters.from} to={filters.to} />}
        noPad>
        <div style={{ padding:'16px 20px' }}>
          <Table
            cols={[
              { key:'reportNumber', label:'Report #', render:r=><span style={{ fontFamily:'monospace', fontWeight:700, color: C.blue }}>{String(r.reportNumber)}</span> },
              { key:'cashier',     label:'Cashier' },
              { key:'shiftStart',  label:'Shift Start',  render:r=>formatDate(String(r.shiftStart)) },
              { key:'shiftEnd',    label:'Shift End',    render:r=>r.shiftEnd ? formatDate(String(r.shiftEnd)) : <Badge label="Open" type="amber" /> },
              { key:'salesCount',  label:'Sales',        align:'right' },
              { key:'totalSales',  label:'Total Sales',  align:'right', render:r=><strong>{formatCurrency(r.totalSales as number)}</strong> },
              { key:'cashSales',   label:'Cash',         align:'right', render:r=>formatCurrency(r.cashSales as number) },
              { key:'cardSales',   label:'Card',         align:'right', render:r=>formatCurrency(r.cardSales as number) },
              { key:'totalRefunds',label:'Refunds',      align:'right', render:r=><span style={{ color: C.red }}>{formatCurrency(r.totalRefunds as number)}</span> },
              { key:'difference',  label:'Diff',         align:'right', render:r=>
                r.difference != null
                  ? <span style={{ color: (r.difference as number)<0 ? C.red : C.green, fontWeight:700 }}>
                      {(r.difference as number)>=0?'+':''}{formatCurrency(r.difference as number)}
                    </span>
                  : <span style={{ color: C.mutedLight }}>—</span>
              },
              { key:'status', label:'Status', render:r=><Badge label={String(r.status)} type={r.status==='CLOSED'?'green':'amber'} /> },
              { key:'_view', label:'', render:r=>(
                <button onClick={()=>setSelected(r)}
                  style={{ padding:'4px 12px', borderRadius:6, border:`1px solid ${C.border}`,
                    background:'transparent', color: C.sub, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  View
                </button>
              )},
            ]}
            rows={data}
            keyFn={(r:any)=>r.id}
          />
        </div>
      </SectionWrap>
      {selected && <ZReportModal report={selected} onClose={()=>setSelected(null)} />}
    </>
  );
}

// ─── SECTION: X-Report ────────────────────────────────────────────────────────
function XReportSection() {
  const [data,    setData]    = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Record<string,unknown>>('/cashier/z-report')
      .then(setData).catch(()=>setData(null)).finally(()=>setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data)   return (
    <div style={{ padding:48, textAlign:'center', color: C.muted }}>
      <div style={{ fontSize:40, marginBottom:12 }}>⚡</div>
      <div style={{ fontSize:15, fontWeight:700, color: C.sub, marginBottom:6 }}>No Active Shift</div>
      <div style={{ fontSize:13 }}>Open a cash drawer from the POS terminal to start a shift.</div>
    </div>
  );

  const leftRows: [string, React.ReactNode][] = [
    ['Cashier',        String(data.cashier)],
    ['Shift Start',    formatDate(String(data.sessionStart))],
    ['Current Time',   formatDate(new Date())],
    ['Total Sales',    <strong style={{ color: C.green }}>{formatCurrency(data.totalSales as number)}</strong>],
    ['Transactions',   String(data.salesCount)],
    ['Cash Sales',     formatCurrency(data.cashSales as number)],
    ['Card Sales',     formatCurrency(data.cardSales as number)],
  ];
  const rightRows: [string, React.ReactNode][] = [
    ['Total Refunds',  <span style={{ color: C.red }}>{formatCurrency(data.totalRefunds as number)}</span>],
    ['Refund Count',   String(data.refundsCount)],
    ['Total Voids',    formatCurrency(data.totalVoids as number)],
    ['Void Count',     String(data.voidsCount)],
    ['Cash In',        formatCurrency(data.cashIn as number)],
    ['Cash Out',       formatCurrency(data.cashOut as number)],
    ['Opening Float',  formatCurrency(data.openingFloat as number)],
    ['Expected Cash',  <strong style={{ color: C.green }}>{formatCurrency(data.expectedCash as number)}</strong>],
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px,1fr))', gap:12 }}>
        <KpiCard icon="💰" label="Sales"        value={formatCurrency(data.totalSales as number)} />
        <KpiCard icon="🧾" label="Transactions" value={String(data.salesCount)} />
        <KpiCard icon="💵" label="Cash Sales"   value={formatCurrency(data.cashSales as number)} />
        <KpiCard icon="💳" label="Card Sales"   value={formatCurrency(data.cardSales as number)} />
      </div>

      <SectionWrap title="Current Shift (X-Report)" icon="⚡"
        subtitle="Live data — shift has NOT been closed">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
          {[...leftRows, ...rightRows].map(([label, value], i) => (
            <div key={String(label)}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'10px 12px', borderBottom:`1px solid ${C.borderLight}`,
                background: i % 2 === 0 ? 'transparent' : '#FAFBFC', fontSize:13 }}>
              <span style={{ color: C.muted }}>{label}</span>
              <span style={{ fontWeight:600, color: C.text }}>{value}</span>
            </div>
          ))}
        </div>
      </SectionWrap>
    </div>
  );
}

// ─── SECTION: Payment Report ──────────────────────────────────────────────────
function PaymentSection({ filters }: { filters: Filters }) {
  const [data,    setData]    = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Record<string,unknown>>(`/reports/payment-methods?from=${filters.from}&to=${filters.to}`)
      .then(setData).catch(()=>{}).finally(()=>setLoading(false));
  }, [filters.from, filters.to]);

  if (loading) return <LoadingState />;
  if (!data)   return null;

  const payments   = (data.payments as Record<string,unknown>[]) || [];
  const grandTotal = data.grandTotal as number;
  const COLORS: Record<string,string> = { CASH:'#16A34A', CARD:'#2563EB' };
  const segments   = payments.map((p,i) => ({
    label: String(p.method), value: p.total as number,
    color: COLORS[String(p.method)] || ['#D97706','#7C3AED','#0891B2'][i] || '#9CA3AF',
  }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px,1fr))', gap:12 }}>
        <KpiCard icon="💰" label="Total Collected" value={formatCurrency(grandTotal)} />
        {payments.map((p,i) => (
          <KpiCard key={String(p.method)} icon={p.method==='CASH'?'💵':'💳'}
            label={String(p.method)} value={formatCurrency(p.total as number)}
            sub={`${p.percentage}% · ${p.count} payments`}
            color={Object.values(COLORS)[i] || C.blue} />
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <SectionWrap title="Payment Distribution" icon="🍩" subtitle="Visual breakdown by method">
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <DonutChart segments={segments} size={150} />
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
              {segments.map(s => (
                <div key={s.label}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background: s.color }} />
                      <span style={{ fontWeight:700, color: C.sub }}>{s.label}</span>
                    </div>
                    <span style={{ fontWeight:800, color: C.text }}>
                      {Number(payments.find(p=>p.method===s.label)?.percentage ?? 0)}%
                    </span>
                  </div>
                  <div style={{ height:8, background: C.borderLight, borderRadius:4, overflow:'hidden' }}>
                    <div style={{
                      height:'100%',
                      width:`${Number(payments.find(p=>p.method===s.label)?.percentage ?? 0)}%`,
                      background: s.color, borderRadius:4, transition:'width 0.6s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionWrap>

        <SectionWrap title="Payment Summary" icon="📊" subtitle="Count and total per method">
          {payments.map(p => (
            <div key={String(p.method)}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'14px 0', borderBottom:`1px solid ${C.borderLight}` }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color: C.text }}>{String(p.method)}</div>
                <div style={{ fontSize:11, color: C.muted }}>{String(p.count)} transactions</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:18, fontWeight:800, color: C.text }}>{formatCurrency(p.total as number)}</div>
                <div style={{ fontSize:11, color: C.muted }}>{String(p.percentage)}% of total</div>
              </div>
            </div>
          ))}
          {!payments.length && <div style={{ color: C.mutedLight, textAlign:'center', padding:24, fontSize:13 }}>No payment data</div>}
        </SectionWrap>
      </div>
    </div>
  );
}

// ─── SECTION: Inventory Report ────────────────────────────────────────────────
function InventorySection() {
  const [data,    setData]    = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'ALL'|'OK'|'LOW'|'OUT'>('ALL');

  useEffect(() => {
    setLoading(true);
    apiFetch<Record<string,unknown>>('/reports/inventory-snapshot')
      .then(setData).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data)   return null;

  const allProducts = (data.products as Record<string,unknown>[]) || [];
  const filtered    = filter === 'ALL' ? allProducts : allProducts.filter(p => p.status === filter);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:12 }}>
        <KpiCard icon="📦" label="Total Products"  value={String(data.total)} />
        <KpiCard icon="✅" label="In Stock"         value={String(data.inStock)}    color={C.green} />
        <KpiCard icon="⚠️" label="Low Stock"        value={String(data.lowStock)}   color={C.amber} />
        <KpiCard icon="❌" label="Out of Stock"     value={String(data.outOfStock)} color={C.red}   />
        <KpiCard icon="💰" label="Inventory Value"  value={formatCurrency(data.inventoryValue as number)} />
        <KpiCard icon="🏪" label="Retail Value"     value={formatCurrency(data.retailValue as number)} color={C.blue} />
      </div>

      <SectionWrap title="Product Stock Levels" icon="📦"
        subtitle={`${filtered.length} products`}
        action={
          <div style={{ display:'flex', gap:6 }}>
            {(['ALL','OK','LOW','OUT'] as const).map(f => (
              <button key={f} onClick={()=>setFilter(f)}
                style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:700,
                  cursor:'pointer', transition:'all 0.15s',
                  border:`1.5px solid ${filter===f ? C.green : C.border}`,
                  background: filter===f ? C.greenBg : 'transparent',
                  color: filter===f ? C.green : C.muted }}>
                {f==='ALL'?'All':f==='OK'?'✅ In Stock':f==='LOW'?'⚠️ Low':'❌ Out'}
              </button>
            ))}
          </div>
        }
        noPad>
        <div style={{ padding:'16px 20px' }}>
          <Table
            cols={[
              { key:'name',      label:'Product' },
              { key:'sku',       label:'SKU' },
              { key:'category',  label:'Category' },
              { key:'stock',     label:'Stock',       align:'right', render:r=><strong style={{ color: (r.status as string)==='OUT' ? C.red : (r.status as string)==='LOW' ? C.amber : C.text }}>{String(r.stock)}</strong> },
              { key:'threshold', label:'Min.',        align:'right' },
              { key:'costPrice', label:'Cost',        align:'right', render:r=>formatCurrency(r.costPrice as number) },
              { key:'price',     label:'Price',       align:'right', render:r=>formatCurrency(r.price as number) },
              { key:'value',     label:'Stock Value', align:'right', render:r=><strong>{formatCurrency(r.value as number)}</strong> },
              { key:'status',    label:'Status',      render:r=><Badge label={String(r.status)} type={(r.status as string)==='OK'?'green':(r.status as string)==='LOW'?'amber':'red'} /> },
            ]}
            rows={filtered}
            keyFn={(r:any) => r.id}
          />
        </div>
      </SectionWrap>
    </div>
  );
}

// ─── SECTION: Product Performance ────────────────────────────────────────────
function ProductSection() {
  const [products, setProducts] = useState<Record<string,unknown>[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{topProducts:Record<string,unknown>[]}>('/reports/top-products?range=monthly')
      .then(d => setProducts(d.topProducts || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  const barData = products.slice(0,10).map(p => ({ label: String(p.name).slice(0,12), value: p.revenue as number }));
  const slowMovers = [...products].reverse().slice(0,10);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionWrap title="Revenue by Product (Top 10)" icon="📊" subtitle="Highest revenue generators">
        <BarChart data={barData} height={160} />
      </SectionWrap>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <SectionWrap title="🏆 Best Sellers" icon="📈" subtitle="Highest quantity sold" noPad>
          <div style={{ padding:'0 20px 16px' }}>
            <Table
              cols={[
                { key:'_rank',    label:'#',       render:(_r,i)=><span style={{ fontWeight:700, color: i<3 ? C.amber : C.mutedLight }}>{i+1}</span> },
                { key:'name',     label:'Product' },
                { key:'quantity', label:'Qty',     align:'right', render:r=><strong>{String(r.quantity)}</strong> },
                { key:'revenue',  label:'Revenue', align:'right', render:r=>formatCurrency(r.revenue as number) },
              ]}
              rows={products.slice(0,10)}
              keyFn={(r:any)=>r.productId}
              perPage={10}
            />
          </div>
        </SectionWrap>

        <SectionWrap title="🐢 Slow Movers" icon="📉" subtitle="Lowest quantity sold" noPad>
          <div style={{ padding:'0 20px 16px' }}>
            <Table
              cols={[
                { key:'name',     label:'Product' },
                { key:'quantity', label:'Qty',     align:'right' },
                { key:'revenue',  label:'Revenue', align:'right', render:r=>formatCurrency(r.revenue as number) },
              ]}
              rows={slowMovers}
              keyFn={(r:any)=>r.productId+'_slow'}
              perPage={10}
            />
          </div>
        </SectionWrap>
      </div>
    </div>
  );
}

// ─── SECTION: Customer Report ─────────────────────────────────────────────────
function CustomerSection({ filters }: { filters: Filters }) {
  const [data,    setData]    = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Record<string,unknown>>(`/reports/customers-report?from=${filters.from}&to=${filters.to}`)
      .then(setData).catch(()=>{}).finally(()=>setLoading(false));
  }, [filters.from, filters.to]);

  if (loading) return <LoadingState />;
  if (!data)   return null;

  const topCustomers = (data.topCustomers as Record<string,unknown>[]) || [];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(185px,1fr))', gap:12 }}>
        <KpiCard icon="👥" label="Total Customers"  value={String(data.total)} />
        <KpiCard icon="🆕" label="New in Period"    value={String(data.newCustomers)}    color={C.green} />
        <KpiCard icon="🔄" label="Returning"        value={String(data.returningCustomers)} color={C.blue} />
        <KpiCard icon="🎯" label="Active in Period" value={String(data.activeInRange)}   color={C.amber} />
        <KpiCard icon="⭐" label="Total Loyalty Pts" value={(data.totalLoyaltyPoints as number).toLocaleString()} color={C.violet} />
      </div>

      <SectionWrap title="Top Customers by Spend" icon="🏆" subtitle="Highest spending customers in period" noPad>
        <div style={{ padding:'16px 20px' }}>
          <Table
            cols={[
              { key:'_rank', label:'#', render:(_r,i)=><span style={{ fontWeight:700, color: i<3 ? C.amber : C.mutedLight }}>{i+1}</span> },
              { key:'name',          label:'Customer' },
              { key:'phone',         label:'Phone',        render:r=>r.phone ? String(r.phone) : <span style={{ color: C.mutedLight }}>—</span> },
              { key:'transactions',  label:'Transactions', align:'right' },
              { key:'spend',         label:'Total Spend',  align:'right', render:r=><strong>{formatCurrency(r.spend as number)}</strong> },
              { key:'loyaltyPoints', label:'Points',       align:'right', render:r=><Badge label={`${r.loyaltyPoints} pts`} type="blue" /> },
            ]}
            rows={topCustomers}
            keyFn={(r:any) => r.id}
          />
        </div>
      </SectionWrap>
    </div>
  );
}

// ─── SECTION: Employee Report ─────────────────────────────────────────────────
function EmployeeSection({ filters }: { filters: Filters }) {
  const [employees, setEmployees] = useState<Record<string,unknown>[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{employees:Record<string,unknown>[]}>(`/reports/employees?from=${filters.from}&to=${filters.to}`)
      .then(d => setEmployees(d.employees || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, [filters.from, filters.to]);

  if (loading) return <LoadingState />;

  const barData = employees.slice(0,8).map(e => ({
    label: String(e.name).split(' ')[0], value: e.revenue as number,
  }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionWrap title="Revenue by Cashier" icon="📊" subtitle="Performance comparison">
        <BarChart data={barData} height={150} />
      </SectionWrap>

      <SectionWrap title="Cashier Performance" icon="👤"
        subtitle={`${employees.length} employees`} noPad>
        <div style={{ padding:'16px 20px' }}>
          <Table
            cols={[
              { key:'name', label:'Employee' },
              { key:'role', label:'Role', render:r=><Badge label={String(r.role)} type={r.role==='ADMIN'?'blue':r.role==='CASHIER'?'green':'amber'} /> },
              { key:'transactions', label:'Transactions', align:'right' },
              { key:'revenue',      label:'Revenue',      align:'right', render:r=><strong>{formatCurrency(r.revenue as number)}</strong> },
              { key:'avgSale',      label:'Avg Sale',     align:'right', render:r=>formatCurrency(r.avgSale as number) },
              { key:'discounts',    label:'Discounts',    align:'right', render:r=>formatCurrency(r.discounts as number) },
              { key:'refunds',      label:'Refunds',      align:'right', render:r=><span style={{ color: C.red }}>{formatCurrency(r.refunds as number)}</span> },
              { key:'voids',        label:'Voids',        align:'right', render:r=>
                (r.voids as number) > 0
                  ? <Badge label={String(r.voids)} type="red" />
                  : <span style={{ color: C.mutedLight }}>0</span>
              },
            ]}
            rows={employees}
            keyFn={(r:any) => r.id}
          />
        </div>
      </SectionWrap>
    </div>
  );
}

// ─── SECTION: Tax Report ──────────────────────────────────────────────────────
function TaxSection({ filters }: { filters: Filters }) {
  const [data,    setData]    = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Record<string,unknown>>(`/reports/tax?from=${filters.from}&to=${filters.to}`)
      .then(setData).catch(()=>{}).finally(()=>setLoading(false));
  }, [filters.from, filters.to]);

  if (loading) return <LoadingState />;
  if (!data)   return null;

  const taxByDay = (data.taxByDay as {date:string;tax:number;revenue:number}[]) || [];
  const barData  = taxByDay.map(d => ({ label: d.date.slice(5), value: d.tax }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:12 }}>
        <KpiCard icon="🧮" label="Total Tax Collected"  value={formatCurrency(data.totalTax as number)} color={C.amber} />
        <KpiCard icon="🧾" label="Taxed Transactions"  value={String(data.transactionCount)} />
        <KpiCard icon="📅" label="Days in Period"       value={taxByDay.length} />
      </div>

      <SectionWrap title="Daily Tax Collection" icon="📊" subtitle="Tax collected per day">
        <BarChart data={barData} height={150} color={C.amber} />
      </SectionWrap>

      <SectionWrap title="Tax by Date" icon="🧮" subtitle="Detailed breakdown" noPad>
        <div style={{ padding:'16px 20px' }}>
          <Table
            cols={[
              { key:'date',    label:'Date' },
              { key:'revenue', label:'Revenue',          align:'right', render:r=>formatCurrency(r.revenue as number) },
              { key:'tax',     label:'Tax Collected',    align:'right', render:r=><strong style={{ color: C.amber }}>{formatCurrency(r.tax as number)}</strong> },
              { key:'_rate',   label:'Effective Rate',   align:'right', render:r=>{
                const rate = ((r.tax as number) / ((r.revenue as number) || 1)) * 100;
                return `${rate.toFixed(2)}%`;
              }},
            ]}
            rows={taxByDay as unknown as Record<string,unknown>[]}
            keyFn={(r:any) => r.date}
          />
        </div>
      </SectionWrap>
    </div>
  );
}

// ─── SECTION: Cash Drawer Report ──────────────────────────────────────────────
function DrawerSection({ filters }: { filters: Filters }) {
  const [drawers, setDrawers] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{drawers:Record<string,unknown>[]}>(`/reports/cash-drawers-report?from=${filters.from}&to=${filters.to}`)
      .then(d => setDrawers(d.drawers || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, [filters.from, filters.to]);

  if (loading) return <LoadingState />;

  return (
    <SectionWrap title="Cash Drawer Sessions" icon="🗃️"
      subtitle={`${drawers.length} sessions in period`} noPad>
      <div style={{ padding:'16px 20px' }}>
        <Table
          cols={[
            { key:'cashier',      label:'Cashier' },
            { key:'openedAt',     label:'Opened',        render:r=>formatDate(String(r.openedAt)) },
            { key:'closedAt',     label:'Closed',        render:r=>r.closedAt ? formatDate(String(r.closedAt)) : <Badge label="Open" type="amber" /> },
            { key:'openingFloat', label:'Opening Float', align:'right', render:r=>formatCurrency(r.openingFloat as number) },
            { key:'closingFloat', label:'Closing Float', align:'right', render:r=>r.closingFloat!=null ? formatCurrency(r.closingFloat as number) : '—' },
            { key:'totalSales',   label:'Sales',         align:'right', render:r=><strong>{formatCurrency(r.totalSales as number)}</strong> },
            { key:'cashSales',    label:'Cash',          align:'right', render:r=>formatCurrency(r.cashSales as number) },
            { key:'cardSales',    label:'Card',          align:'right', render:r=>formatCurrency(r.cardSales as number) },
            { key:'cashIn',       label:'Cash In',       align:'right', render:r=>formatCurrency(r.cashIn as number) },
            { key:'cashOut',      label:'Cash Out',      align:'right', render:r=>formatCurrency(r.cashOut as number) },
            { key:'expectedCash', label:'Expected',      align:'right', render:r=>formatCurrency(r.expectedCash as number) },
            { key:'difference',   label:'Diff',          align:'right', render:r=>
              r.difference != null
                ? <span style={{ color: (r.difference as number)<0 ? C.red : (r.difference as number)>0 ? C.amber : C.green, fontWeight:700 }}>
                    {(r.difference as number)>=0?'+':''}{formatCurrency(r.difference as number)}
                  </span>
                : '—'
            },
            { key:'status', label:'Status', render:r=><Badge label={String(r.status)} type={r.status==='CLOSED'?'green':'amber'} /> },
          ]}
          rows={drawers}
          keyFn={(r:any) => r.id}
        />
      </div>
    </SectionWrap>
  );
}

// ─── SECTION: Audit Log ───────────────────────────────────────────────────────
function AuditSection() {
  const [logs,    setLogs]    = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch<{activity:Record<string,unknown>[]}>('/activity')
      .then(d => setLogs(d.activity || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(a =>
      [a.action, a.entity, (a.user as any)?.name, a.entityId]
        .join(' ').toLowerCase().includes(q)
    );
  }, [logs, search]);

  if (loading) return <LoadingState />;

  return (
    <SectionWrap title="Audit Log" icon="🔍"
      subtitle={`${logs.length} recent events`}
      action={
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by action, user, entity…"
          style={{ padding:'6px 12px', borderRadius:8, border:`1.5px solid ${C.border}`,
            fontSize:12, color: C.text, background:'#F9FAFB', outline:'none', width:220 }} />
      }
      noPad>
      <div style={{ padding:'16px 20px' }}>
        <Table
          cols={[
            { key:'createdAt', label:'Date & Time', render:r=><span style={{ fontFamily:'monospace', fontSize:11 }}>{formatDate(String(r.createdAt))}</span> },
            { key:'_user', label:'User', render:r=>(r.user as any)?.name || <span style={{ color: C.mutedLight }}>System</span> },
            { key:'action', label:'Action', render:r=><code style={{ fontSize:11, background: C.borderLight, padding:'2px 7px', borderRadius:5, color: C.blue }}>{String(r.action)}</code> },
            { key:'entity', label:'Entity', render:r=><Badge label={String(r.entity)} type="gray" /> },
            { key:'entityId', label:'ID', render:r=>r.entityId ? <span style={{ fontFamily:'monospace', fontSize:10, color: C.mutedLight }}>{String(r.entityId).slice(0,14)}…</span> : '—' },
          ]}
          rows={filtered}
          keyFn={(r:any) => r.id}
        />
      </div>
    </SectionWrap>
  );
}

// ─── MAIN REPORTS PAGE ─────────────────────────────────────────────────────────
export function ReportsPage() {
  const [active,     setActive]     = useState('dashboard');
  const [preset,     setPreset]     = useState<Preset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [cashierId,  setCashierId]  = useState('');
  const [payMethod,  setPayMethod]  = useState('');
  const [users,      setUsers]      = useState<{id:string;name:string}[]>([]);

  useEffect(() => {
    apiFetch<{users:{id:string;name:string}[]}>('/users')
      .then(d => setUsers(d.users || [])).catch(()=>{});
  }, []);

  const dateRange = preset === 'custom' && customFrom && customTo
    ? { from: customFrom, to: customTo }
    : presetRange(preset);

  const filters: Filters = { ...dateRange, cashierId, paymentMethod: payMethod };

  const activeSection = SECTIONS.find(s => s.id === active)!;

  function renderContent() {
    switch (active) {
      case 'dashboard':  return <DashboardSection filters={filters} />;
      case 'sales':      return <SalesSection     filters={filters} />;
      case 'zreports':   return <ZReportsSection  filters={filters} />;
      case 'xreport':    return <XReportSection />;
      case 'payment':    return <PaymentSection   filters={filters} />;
      case 'inventory':  return <InventorySection />;
      case 'products':   return <ProductSection />;
      case 'customers':  return <CustomerSection  filters={filters} />;
      case 'employees':  return <EmployeeSection  filters={filters} />;
      case 'tax':        return <TaxSection       filters={filters} />;
      case 'drawer':     return <DrawerSection    filters={filters} />;
      case 'audit':      return <AuditSection />;
      default:           return null;
    }
  }

  const PRESETS: { id: Preset; label: string }[] = [
    { id:'today',     label:'Today'      },
    { id:'yesterday', label:'Yesterday'  },
    { id:'week',      label:'This Week'  },
    { id:'month',     label:'This Month' },
    { id:'year',      label:'This Year'  },
    { id:'custom',    label:'Custom'     },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh',
      background: C.pageBg, fontFamily:"'Outfit','Inter','Segoe UI',sans-serif" }}>

      {/* ── Top Bar ── */}
      <div style={{ background: C.bg, borderBottom:`1px solid ${C.border}`,
        padding:'12px 24px', display:'flex', alignItems:'center',
        justifyContent:'space-between', position:'sticky', top:0, zIndex:30,
        boxShadow:'0 1px 0 rgba(0,0,0,0.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background: C.greenBg,
            border:`1px solid ${C.greenBorder}`, display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:20 }}>📊</div>
          <div>
            <h1 style={{ margin:0, fontSize:16, fontWeight:800, color: C.text }}>Reports</h1>
            <p style={{ margin:0, fontSize:11, color: C.muted }}>FreshMart POS · Business Intelligence</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <ExportBar from={filters.from} to={filters.to} />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ background: C.bg, borderBottom:`1px solid ${C.border}`,
        padding:'10px 24px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>

        {/* Date presets */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.id} id={`preset-${p.id}`} onClick={()=>setPreset(p.id)}
              style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700,
                cursor:'pointer', transition:'all 0.15s',
                border:`1.5px solid ${preset===p.id ? C.green : C.border}`,
                background: preset===p.id ? C.greenBg : 'transparent',
                color: preset===p.id ? C.green : C.muted }}>
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input id="filter-from" type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:8, border:`1.5px solid ${C.border}`,
                fontSize:12, color: C.text, background:'#F9FAFB', outline:'none' }} />
            <span style={{ color: C.muted, fontSize:13 }}>→</span>
            <input id="filter-to" type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:8, border:`1.5px solid ${C.border}`,
                fontSize:12, color: C.text, background:'#F9FAFB', outline:'none' }} />
          </div>
        )}

        <div style={{ width:1, height:22, background: C.border, margin:'0 2px' }} />

        {/* Cashier filter */}
        <select id="filter-cashier" value={cashierId} onChange={e=>setCashierId(e.target.value)}
          style={{ padding:'6px 10px', borderRadius:8, border:`1.5px solid ${C.border}`,
            fontSize:12, color: C.text, background:'#F9FAFB', outline:'none', cursor:'pointer' }}>
          <option value="">All Cashiers</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        {/* Payment filter */}
        <select id="filter-payment" value={payMethod} onChange={e=>setPayMethod(e.target.value)}
          style={{ padding:'6px 10px', borderRadius:8, border:`1.5px solid ${C.border}`,
            fontSize:12, color: C.text, background:'#F9FAFB', outline:'none', cursor:'pointer' }}>
          <option value="">All Payments</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
        </select>

        <div style={{ marginLeft:'auto', fontSize:11, color: C.muted, fontWeight:600 }}>
          📅 {filters.from} → {filters.to}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:'flex', flex:1, minHeight:0 }}>

        {/* Sidebar */}
        <aside style={{ width:220, background: C.bg, borderRight:`1px solid ${C.border}`,
          padding:'14px 10px', display:'flex', flexDirection:'column', gap:3,
          position:'sticky', top:111, height:'calc(100vh - 111px)',
          overflowY:'auto', flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color: C.mutedLight,
            letterSpacing:'0.08em', padding:'4px 10px 8px', textTransform:'uppercase' }}>
            Report Categories
          </div>
          {SECTIONS.map(section => {
            const isActive = section.id === active;
            return (
              <button key={section.id} id={`report-nav-${section.id}`}
                onClick={()=>setActive(section.id)}
                style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 11px',
                  borderRadius:9, border:'none', width:'100%', textAlign:'left',
                  cursor:'pointer', transition:'all 0.13s',
                  background: isActive ? C.greenBg : 'transparent',
                  color: isActive ? C.green : C.sub,
                  boxShadow: isActive ? `inset 3px 0 0 ${C.green}` : 'none' }}>
                <span style={{ fontSize:17, flexShrink:0 }}>{section.icon}</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight: isActive ? 700 : 500,
                    lineHeight:1.2, whiteSpace:'nowrap',
                    overflow:'hidden', textOverflow:'ellipsis' }}>
                    {section.label}
                  </div>
                  <div style={{ fontSize:10, lineHeight:1.2, marginTop:1,
                    color: isActive ? '#4ADE80' : C.mutedLight }}>
                    {section.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Main content */}
        <main style={{ flex:1, padding:'24px', overflowY:'auto', minWidth:0 }}>
          {/* Section header */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <span style={{ fontSize:24 }}>{activeSection.icon}</span>
              <h2 style={{ margin:0, fontSize:20, fontWeight:800, color: C.text }}>
                {activeSection.label}
              </h2>
            </div>
            <p style={{ margin:0, fontSize:13, color: C.muted }}>
              {activeSection.desc} &nbsp;·&nbsp; {filters.from} to {filters.to}
            </p>
          </div>

          {renderContent()}
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
      `}</style>
    </div>
  );
}
