import React, { useState, useEffect } from "react";
import "../styles/theme.css";

const motivationalQuotes = [
  "🚀 يوم جديد، فرصة جديدة لكسر الأرقام القياسية!",
  "💡 الابتسامة في وجه العميل هي أول خطوة لزيادة المبيعات.",
  "🔥 اقترح إضافة (صوص أو حجم أكبر) لرفع متوسط الفاتورة.",
  "🏆 خدمة العملاء الممتازة تصنع زبوناً مدى الحياة."
];

const Header = ({ user, onLogout }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const quoteTimer = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % motivationalQuotes.length);
    }, 10000);
    return () => clearInterval(quoteTimer);
  }, []);

  const displayName = user?.name || "أحمد الإدارة";
  const displayRole = user?.role || "مدير النظام";

  return (
    <div style={{ height: '72px', background: 'var(--paper-raised)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', boxShadow: 'var(--shadow-sm)', zIndex: 10, flexShrink: 0 }}>

      <div key={quoteIndex} className="n-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '19px' }}>{motivationalQuotes[quoteIndex].split(' ')[0]}</span>
        <div style={{ color: 'var(--ink-soft)', fontWeight: 700, fontSize: '14.5px' }}>
          {motivationalQuotes[quoteIndex].substring(2)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink)' }}>{displayName}</div>
          <div style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>{displayRole}</div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: '13px', background: 'linear-gradient(135deg, var(--teal), var(--teal-deep))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '17px', boxShadow: '0 4px 10px rgba(31,158,146,0.3)' }}>
          {displayName.charAt(0)}
        </div>
        {onLogout && (
          <button onClick={onLogout} className="n-btn n-btn-outline" style={{ padding: '9px 16px', fontSize: '13px' }}>خروج</button>
        )}
      </div>
    </div>
  );
};

export default Header;
