import React from "react";
import { Icons } from "../components/Icons";
import "../styles/theme.css";

const Sidebar = ({ activeTab, setActiveTab, role }) => {
  const tabs = [
    { id: 'reports', icon: <Icons.Trending size={21} />, label: 'التقارير والأرباح' },
    { id: 'live_orders', icon: <Icons.Clock size={21} />, label: 'الطلبات الحية' },
    { id: 'inventory', icon: <Icons.Layers size={21} />, label: 'المنيو والمخزن' },
    { id: 'categories', icon: <Icons.Grid size={21} />, label: 'ترتيب الأقسام' },
    { id: 'invoices', icon: <Icons.Receipt size={21} />, label: 'سجل الفواتير' },
    { id: 'customers', icon: <Icons.Users2 size={21} />, label: 'العملاء والولاء' },
    { id: 'rewards', icon: <Icons.Gift size={21} />, label: 'المكافآت' },
    { id: 'users', icon: <Icons.Lock size={21} />, label: 'طاقم العمل' },
    { id: 'admin_roles', icon: <Icons.Shield size={21} />, label: 'صلاحيات الإدارة', superOnly: true },
    { id: 'audit_log', icon: <Icons.History size={21} />, label: 'سجل النشاط', superOnly: true },
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
            {role === 'مدير عام' ? <Icons.Crown /> : <Icons.Shield size={14} />} {role}
          </span>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
