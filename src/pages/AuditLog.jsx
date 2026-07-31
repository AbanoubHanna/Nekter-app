import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Icons } from "../components/Icons";

const TABLE_LABELS = { products: "منتج", categories: "قسم", staff_users: "موظف" };
const ACTION_LABELS = { INSERT: "إضافة", UPDATE: "تعديل", DELETE: "حذف" };
const ACTION_TAG = { INSERT: "tag-cold", UPDATE: "tag-sweet", DELETE: "tag-hot" };

const summarize = (entry) => {
  const data = entry.new_data || entry.old_data || {};
  return data.name || data.email || "—";
};

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [filterTable, setFilterTable] = useState("الكل");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (data) setLogs(data);
      setLoading(false);
    })();
  }, []);

  const filtered = filterTable === "الكل" ? logs : logs.filter(l => l.table_name === filterTable);

  return (
    <div className="n-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Icons.History size={22} /> سجل النشاط</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-faint)', fontSize: '13px' }}>كل تعديل على المنيو أو الأقسام أو الموظفين متسجل هنا تلقائيًا — مين وعمل إيه وإمتى</p>
        </div>
        <select className="n-select" style={{ width: '180px', margin: 0 }} value={filterTable} onChange={e => setFilterTable(e.target.value)}>
          <option value="الكل">كل الأنواع</option>
          <option value="products">المنتجات</option>
          <option value="categories">الأقسام</option>
          <option value="staff_users">الموظفين</option>
        </select>
      </div>

      <div className="n-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>مين</th><th>عمل إيه</th><th>على إيه</th><th>الوقت</th><th style={{ textAlign: 'center' }}>تفاصيل</th></tr></thead>
          <tbody>
            {filtered.map(l => (
              <React.Fragment key={l.id}>
                <tr>
                  <td style={{ fontSize: '13px' }}>{l.actor_email}</td>
                  <td><span className={`tag ${ACTION_TAG[l.action]}`}>{ACTION_LABELS[l.action] || l.action}</span></td>
                  <td>{TABLE_LABELS[l.table_name] || l.table_name}: <b>{summarize(l)}</b></td>
                  <td style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>{new Date(l.created_at).toLocaleString('ar-EG')}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="n-btn n-btn-ghost" style={{ padding: '4px 10px', fontSize: '13px' }} onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                      {expanded === l.id ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
                {expanded === l.id && (
                  <tr>
                    <td colSpan={5} style={{ background: 'var(--paper)', padding: '16px 20px' }}>
                      <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', color: 'var(--ink-soft)' }}>
{JSON.stringify({ قبل: l.old_data, بعد: l.new_data }, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-faint)' }}>لا يوجد نشاط مسجل بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLog;
