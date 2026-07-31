import React, { useState, useMemo } from "react";
import AnimatedNumber from "../components/AnimatedNumber";

const getOrderDate = (o) => o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);

const Customers = ({ orders }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState("");

  const normalizePhone = (phone) => {
    if (!phone) return "بدون رقم";
    let englishNumbers = phone.toString().replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    let clean = englishNumbers.replace(/\D/g, "");
    if (clean.startsWith("966")) clean = clean.slice(3);
    if (clean.startsWith("0")) clean = clean.slice(1);
    return `0${clean}`;
  };

  const customersMap = orders.reduce((acc, o) => {
    const phone = normalizePhone(o.customerPhone);
    if (phone === "بدون رقم") return acc;

    if (!acc[phone]) {
      acc[phone] = { name: o.customerName || 'عميل', phone, total: 0, count: 0, items: {}, lastOrder: null };
    }
    acc[phone].total += (Number(o.total) || 0);
    acc[phone].count += 1;
    const d = getOrderDate(o);
    if (!acc[phone].lastOrder || d > acc[phone].lastOrder) acc[phone].lastOrder = d;
    (o.items || []).forEach(item => { acc[phone].items[item.name] = (acc[phone].items[item.name] || 0) + item.qty; });
    return acc;
  }, {});

  const customersList = Object.values(customersMap)
    .filter(c => !search || c.name.includes(search) || c.phone.includes(search))
    .sort((a, b) => b.total - a.total);

  const totalRevenue = Object.values(customersMap).reduce((s, c) => s + c.total, 0);
  const totalCustomers = Object.values(customersMap).length;
  const avgSpend = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;

  const getTier = (total) => {
    if (total >= 2000) return { name: '💎 بلاتيني', tag: 'tag-neutral' };
    if (total >= 1000) return { name: '🥇 ذهبي', tag: 'tag-hot' };
    if (total >= 500) return { name: '🥈 فضي', tag: 'tag-neutral' };
    return { name: '🥉 برونزي', tag: 'tag-sweet' };
  };

  const getFavoriteItem = (items) => Object.keys(items).length > 0 ? Object.keys(items).reduce((a, b) => items[a] > items[b] ? a : b) : "غير محدد";

  return (
    <div className="n-fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '0ms', padding: '20px' }}>
          <div style={{ color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 600 }}>عدد العملاء المسجّلين</div>
          <div style={{ fontSize: '26px', fontWeight: 900, marginTop: '4px', color: 'var(--ink)' }}><AnimatedNumber value={totalCustomers} /></div>
        </div>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '60ms', padding: '20px', borderRight: '5px solid var(--teal)' }}>
          <div style={{ color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 600 }}>إجمالي إنفاق العملاء</div>
          <div style={{ fontSize: '26px', fontWeight: 900, marginTop: '4px', color: 'var(--teal-deep)' }}><AnimatedNumber value={totalRevenue} /> ر.س</div>
        </div>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '120ms', padding: '20px', borderRight: '5px solid var(--amber)' }}>
          <div style={{ color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 600 }}>متوسط إنفاق العميل</div>
          <div style={{ fontSize: '26px', fontWeight: 900, marginTop: '4px', color: 'var(--amber-deep)' }}><AnimatedNumber value={avgSpend} /> ر.س</div>
        </div>
      </div>

      <input className="n-input" placeholder="🔍 ابحث بالاسم أو رقم الجوال..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '16px', maxWidth: '340px' }} />

      <div className="n-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>العميل</th><th>رقم الجوال</th><th>المستوى</th><th>الإنفاق</th><th>آخر طلب</th><th>تواصل</th></tr></thead>
          <tbody>
            {customersList.map((c, i) => {
              const tier = getTier(c.total);
              return (
                <tr key={i}>
                  <td><b>{c.name}</b></td>
                  <td style={{ letterSpacing: '1px', color: 'var(--ink-soft)' }}>{c.phone}</td>
                  <td><span className={`tag ${tier.tag}`}>{tier.name}</span></td>
                  <td><span className="stub" style={{ fontSize: '13px', color: 'var(--teal-deep)' }}>{c.total.toLocaleString()} ر.س</span></td>
                  <td style={{ color: 'var(--ink-faint)', fontSize: '13px' }}>{c.lastOrder ? c.lastOrder.toLocaleDateString('ar-EG') : '—'}</td>
                  <td>
                    <button className="n-btn n-btn-outline" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => setSelectedCustomer(c)}>👁️ بروفايل</button>
                  </td>
                </tr>
              );
            })}
            {customersList.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-faint)' }}>لا يوجد عملاء مطابقين</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setSelectedCustomer(null)}>
          <div className="n-card n-fade-in" style={{ maxWidth: '350px', width: '100%', margin: '20px', textAlign: 'center', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, var(--teal), var(--teal-deep))', color: 'white', borderRadius: '50%', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
              {selectedCustomer.name.charAt(0)}
            </div>
            <h2 style={{ margin: '0 0 5px 0', color: 'var(--ink)', fontSize: '20px' }}>{selectedCustomer.name}</h2>
            <div style={{ color: 'var(--ink-faint)', marginBottom: '15px' }}>{selectedCustomer.phone}</div>

            <div style={{ background: 'var(--paper)', padding: '15px', borderRadius: 'var(--r-lg)', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><div style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>الإنفاق</div><b style={{ color: 'var(--teal-deep)' }}>{selectedCustomer.total} ر.س</b></div>
              <div><div style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>الطلبات</div><b>{selectedCustomer.count} طلب</b></div>
              <div style={{ gridColumn: '1 / -1', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--line)' }}>
                <div style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>المشروب المفضل 🥤</div>
                <b>{getFavoriteItem(selectedCustomer.items)}</b>
              </div>
            </div>

            <a href={`https://wa.me/966${selectedCustomer.phone.substring(1)}?text=أهلاً ${selectedCustomer.name}، اشتقنالك في نكتير بار! طلبك المفضل (${getFavoriteItem(selectedCustomer.items)}) مستنيك بخصم خاص اليوم.`}
              target="_blank" rel="noreferrer" className="n-btn" style={{ background: '#25D366', color: 'white', width: '100%', padding: '13px', textDecoration: 'none' }}>
              💬 إرسال عرض على الواتساب
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
