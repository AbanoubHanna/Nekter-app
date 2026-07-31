import React, { useState, useMemo } from "react";
import * as XLSX from 'xlsx';

const RANGE_OPTIONS = [
  { id: "today", label: "اليوم" },
  { id: "week", label: "آخر 7 أيام" },
  { id: "month", label: "آخر 30 يوم" },
  { id: "all", label: "كل الفترات" },
];

const getOrderDate = (o) => o.createdAt ? new Date(o.createdAt) : null;

const Invoices = ({ orders = [] }) => {
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    let list = orders;
    if (range !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (range === "today") cutoff.setHours(0, 0, 0, 0);
      if (range === "week") cutoff.setDate(now.getDate() - 7);
      if (range === "month") cutoff.setDate(now.getDate() - 30);
      list = list.filter(o => { const d = getOrderDate(o); return d && d >= cutoff; });
    }
    if (search) {
      const s = search.trim();
      list = list.filter(o =>
        (o.customerName || "").includes(s) ||
        (o.customerPhone || "").includes(s) ||
        (o.tableNumber || "").toString().includes(s) ||
        o.id.slice(-6).toUpperCase().includes(s.toUpperCase())
      );
    }
    return list;
  }, [orders, range, search]);

  const totalRevenue = filtered.reduce((s, o) => s + (Number(o.total) || 0), 0);

  const exportExcel = () => {
    const rows = filtered.map(o => ({
      "رقم الطلب": `#${o.id.slice(-6).toUpperCase()}`,
      "العميل": o.customerName || `طاولة ${o.tableNumber || ""}`,
      "الجوال": o.customerPhone || "",
      "الإجمالي": o.total,
      "طريقة الدفع": o.paymentMethod || "كاش",
      "الحالة": o.status || "",
      "التاريخ": getOrderDate(o) ? getOrderDate(o).toLocaleString('ar-EG') : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الفواتير");
    XLSX.writeFile(wb, `Nekter_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="n-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>سجل الفواتير 🧾</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-faint)', fontSize: '13px' }}>{filtered.length} فاتورة · إجمالي {totalRevenue.toLocaleString()} ر.س</p>
        </div>
        <button className="n-btn n-btn-primary" style={{ padding: '11px 20px' }} onClick={exportExcel}>📤 تصدير Excel</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="n-input" placeholder="🔍 ابحث بالاسم أو الجوال أو رقم الطاولة أو رقم الطلب..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: '240px', margin: 0 }} />
        <div style={{ display: 'flex', gap: '6px', background: 'var(--paper)', padding: '5px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)' }}>
          {RANGE_OPTIONS.map(o => (
            <button key={o.id} onClick={() => setRange(o.id)} className="n-btn" style={{
              padding: '8px 13px', fontSize: '12.5px',
              background: range === o.id ? 'var(--ink)' : 'transparent',
              color: range === o.id ? 'white' : 'var(--ink-soft)',
              boxShadow: 'none'
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      <div className="n-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>رقم الطلب</th><th>العميل</th><th>الإجمالي</th><th>الدفع</th><th>الحالة</th><th>التاريخ</th><th style={{ textAlign: 'center' }}>التفاصيل</th></tr></thead>
          <tbody>
            {filtered.map(o => {
              const d = getOrderDate(o);
              const isOpen = expandedId === o.id;
              return (
                <React.Fragment key={o.id}>
                  <tr>
                    <td style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>#{o.id.slice(-6).toUpperCase()}</td>
                    <td>{o.customerName || `طاولة ${o.tableNumber || "—"}`}</td>
                    <td><span className="stub" style={{ fontSize: '13px', color: 'var(--teal-deep)' }}>{o.total} ر.س</span></td>
                    <td>{o.paymentMethod || 'كاش'}</td>
                    <td><span className="tag tag-neutral">{o.status || '—'}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>{d ? d.toLocaleString('ar-EG') : 'الآن'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="n-btn n-btn-ghost" style={{ padding: '4px 10px', fontSize: '13px' }} onClick={() => setExpandedId(isOpen ? null : o.id)}>{isOpen ? '▲' : '▼'}</button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--paper)', padding: '16px 20px' }}>
                        {(o.items || []).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', color: 'var(--ink-soft)' }}>
                            <span>{item.qty}x {item.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{item.price * item.qty} ر.س</span>
                          </div>
                        ))}
                        {o.notes && <div style={{ marginTop: '8px', color: 'var(--danger)', fontSize: '12px', fontWeight: '700' }}>📝 {o.notes}</div>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-faint)' }}>لا توجد فواتير مطابقة</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Invoices;
