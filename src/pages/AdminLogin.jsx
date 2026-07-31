import React, { useState } from "react";
import { supabase } from "../supabase";
import "../styles/theme.css";

const AdminLogin = ({ onLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      return;
    }
    onLoggedIn(data.session);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div className="n-card n-rise" style={{ padding: '40px', width: '100%', maxWidth: '420px', margin: '20px', textAlign: 'center' }}>
        <img src="/logo.png" alt="Nekter" style={{ height: '52px', objectFit: 'contain', marginBottom: '18px', filter: 'brightness(0)' }} />
        <h2 style={{ margin: '0 0 6px 0', color: 'var(--ink)' }}>دخول لوحة التحكم</h2>
        <p style={{ margin: '0 0 24px 0', color: 'var(--ink-faint)', fontSize: '13px' }}>هذه الشاشة محمية — للإدارة فقط</p>

        <form onSubmit={handleSubmit}>
          <input type="email" required placeholder="البريد الإلكتروني" className="n-input" style={{ textAlign: 'left', direction: 'ltr', marginBottom: '14px' }}
            value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required placeholder="كلمة المرور" className="n-input" style={{ textAlign: 'left', direction: 'ltr', marginBottom: '10px' }}
            value={password} onChange={e => setPassword(e.target.value)} />

          {error && <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: '700', marginBottom: '14px' }}>{error}</div>}

          <button type="submit" disabled={loading} className="n-btn n-btn-primary" style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '8px' }}>
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
