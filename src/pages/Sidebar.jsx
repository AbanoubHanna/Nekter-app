import React from "react";
import "../styles/theme.css";

const Icons = {
  Reports: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 3v18h18"/><path d="M18 17l-6-6-4 4-5-5"/></svg>,
  LiveOrders: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Inventory: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 8l-9-4-9 4 9 4 9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 16l9 4 9-4"/></svg>,
  Categories: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  Invoices: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h10M7 9h10"/></svg>,
  Customers: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Rewards: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>,
  Users: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Shield: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  History: () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 3v5h5"/><path d="M3.05 13a9 9 0 1 0 .5-4.5L3 8"/><path d="M12 7v5l4 2"/></svg>
};

const Sidebar = ({ activeTab, setActiveTab, role }) => {
  const tabs = [
    { id: 'reports', icon: <Icons.Reports />, label: 'التقارير والأرباح' },
    { id: 'live_orders', icon: <Icons.LiveOrders />, label: 'الطلبات الحية' },
    { id: 'inventory', icon: <Icons.Inventory />, label: 'المنيو والمخزن' },
    { id: 'categories', icon: <Icons.Categories />, label: 'ترتيب الأقسام' },
    { id: 'invoices', icon: <Icons.Invoices />, label: 'سجل الفواتير' },
    { id: 'customers', icon: <Icons.Customers />, label: 'العملاء والولاء' },
    { id: 'rewards', icon: <Icons.Rewards />, label: 'المكافآت' },
    { id: 'users', icon: <Icons.Users />, label: 'طاقم العمل' },
    { id: 'admin_roles', icon: <Icons.Shield />, label: 'صلاحيات الإدارة', superOnly: true },
    { id: 'audit_log', icon: <Icons.History />, label: 'سجل النشاط', superOnly: true },
  ].filter(t => !t.superOnly || role === 'مدير عام');

  return (
    <div style={{ width: '270px', background: 'linear-gradient(180deg, var(--ink) 0%, #1E2A44 100%)', color: 'white', padding: '28px 18px', display: 'flex', flexDirection: 'column', height: '100vh', zIndex: 20, flexShrink: 0 }}>

      <div style={{ textAlign: 'center', marginBottom: '34px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <img src="/logo.png" alt="Nekter Logo" style={{ maxWidth: '135px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 18px', borderRadius: '12px', cursor: 'pointer', border: 'none', width: '100%', fontSize: '14.5px', fontWeight: '700', marginBottom: '6px', textAlign: 'right', transition: 'all 0.25s ease', fontFamily: 'var(--font-display)',
              background: activeTab === tab.id ? 'rgba(31, 158, 146, 0.16)' : 'transparent',
              color: activeTab === tab.id ? '#4ED8C8' : '#93A0B8',
              boxShadow: activeTab === tab.id ? 'inset -4px 0 0 var(--teal)' : 'none'
            }}
            onMouseEnter={(e) => { if (activeTab !== tab.id) { e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'translateX(-4px)'; } }}
            onMouseLeave={(e) => { if (activeTab !== tab.id) { e.currentTarget.style.color = '#93A0B8'; e.currentTarget.style.transform = 'translateX(0)'; } }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {role && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <span className="tag" style={{ background: role === 'مدير عام' ? 'rgba(201,125,46,0.18)' : 'rgba(255,255,255,0.08)', color: role === 'مدير عام' ? '#E5A76B' : '#93A0B8' }}>
            {role === 'مدير عام' ? '👑' : '🛡️'} {role}
          </span>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
