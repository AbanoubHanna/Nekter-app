import React, { useState } from "react";
import { supabase } from "../supabase";
import "../styles/theme.css";

// Shown once, right after an invited admin clicks the email link and lands
// back on /admin with a fresh (but password-less) session — Supabase's
// invite flow authenticates them immediately but never asks for a password,
// so without this step they'd have no way to log back in next time.
const AdminSetPassword = ({ email, onDone }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("الباسورد لازم يكون 6 حروف/أرقام على الأقل"); return; }
    if (password !== confirm) { setError("الباسورد وتأكيده مش متطابقين"); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError("حصل خطأ: " + updateError.message); return; }
    onDone();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div className="n-card n-rise" style={{ padding: '40px', width: '100%', maxWidth: '420px', margin: '20px', textAlign: 'center' }}>
        <img src="/logo.png" alt="Nekter" style={{ height: '52px', objectFit: 'contain', marginBottom: '18px', filter: 'brightness(0)' }} />
        <h2 style={{ margin: '0 0 6px 0', color: 'var(--ink)' }}>أهلاً بيك في نكتير</h2>
        <p style={{ margin: '0 0 24px 0', color: 'var(--ink-faint)', fontSize: '13px' }}>حدد باسورد لحسابك ({email}) عشان تقدر تدخل بيه المرات الجاية</p>

        <form onSubmit={handleSubmit}>
          <input type="password" required placeholder="باسورد جديد" className="n-input" style={{ marginBottom: '14px', textAlign: 'left', direction: 'ltr' }}
            value={password} onChange={e => setPassword(e.target.value)} />
          <input type="password" required placeholder="تأكيد الباسورد" className="n-input" style={{ marginBottom: '14px', textAlign: 'left', direction: 'ltr' }}
            value={confirm} onChange={e => setConfirm(e.target.value)} />

          {error && <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: '700', marginBottom: '14px' }}>{error}</div>}

          <button type="submit" disabled={loading} className="n-btn n-btn-primary" style={{ width: '100%', padding: '15px', fontSize: '16px' }}>
            {loading ? "جاري الحفظ..." : "حفظ ومتابعة"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSetPassword;
