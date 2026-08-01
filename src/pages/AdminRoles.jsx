import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Icons } from "../components/Icons";

const AdminRoles = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null); // { ok, message }

  const fetchAdmins = async () => {
    const { data } = await supabase.from('admin_profiles').select('*').order('created_at', { ascending: true });
    if (data) setAdmins(data);
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const toggleRole = async (admin) => {
    const newRole = admin.role === 'مدير عام' ? 'مشرف' : 'مدير عام';
    if (!window.confirm(`تحويل ${admin.email} إلى "${newRole}"؟`)) return;
    const { error } = await supabase.rpc('rpc_set_admin_role', { p_email: admin.email, p_role: newRole });
    if (error) { alert("مسموح لمدير عام فقط بهذا الإجراء."); return; }
    fetchAdmins();
  };

  const inviteAdmin = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: { email: inviteEmail } });
    setInviting(false);
    if (error || data?.error) {
      setInviteResult({ ok: false, message: data?.error || "حصل خطأ أثناء إرسال الدعوة" });
      return;
    }
    setInviteResult({ ok: true, message: `تم إرسال دعوة إلى ${inviteEmail} — هيظهر هنا بمجرد ما يقبلها ويسجّل دخول.` });
    setInviteEmail("");
  };

  return (
    <div className="n-fade-in">
      <div style={{ marginBottom: '18px' }}>
        <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Icons.Shield size={22} /> صلاحيات الإدارة</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--ink-faint)', fontSize: '13px' }}>
          "مدير عام" يشوف ويتحكم في كل حاجة. "مشرف" يدير التشغيل اليومي بدون صلاحية على طاقم العمل أو سجل النشاط.
        </p>
      </div>

      <div className="n-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>البريد الإلكتروني</th><th>الصلاحية</th><th>عضو منذ</th><th style={{ textAlign: 'center' }}>إجراء</th></tr></thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}>
                <td style={{ direction: 'ltr', textAlign: 'right', fontSize: '13px' }}>{a.email}</td>
                <td><span className={`tag ${a.role === 'مدير عام' ? 'tag-hot' : 'tag-cold'}`}>{a.role === 'مدير عام' ? <Icons.Crown /> : <Icons.Shield size={14} />} {a.role}</span></td>
                <td style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>{new Date(a.created_at).toLocaleDateString('ar-EG')}</td>
                <td style={{ textAlign: 'center' }}>
                  <button className="n-btn n-btn-outline" style={{ padding: '7px 14px', fontSize: '12px' }} onClick={() => toggleRole(a)}>
                    تحويل إلى {a.role === 'مدير عام' ? 'مشرف' : 'مدير عام'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && admins.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-faint)' }}>لا يوجد حسابات إدارية بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="n-card" style={{ marginTop: '16px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.Plus size={16} /> دعوة مدير جديد</h3>
        <p style={{ margin: '0 0 14px 0', color: 'var(--ink-faint)', fontSize: '12.5px' }}>
          هيوصله إيميل دعوة يحدد بيه باسوورد، وبمجرد ما يسجّل دخول مرة على /admin هيظهر هنا تلقائيًا كـ"مشرف" وتقدر ترقّيه.
        </p>
        <form onSubmit={inviteAdmin} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input type="email" required placeholder="بريد المدير الجديد" className="n-input" style={{ flex: 1, minWidth: '220px', margin: 0, direction: 'ltr', textAlign: 'left' }}
            value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          <button type="submit" disabled={inviting} className="n-btn n-btn-primary" style={{ padding: '0 20px' }}>
            {inviting ? "جاري الإرسال..." : "إرسال الدعوة"}
          </button>
        </form>
        {inviteResult && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', background: inviteResult.ok ? 'var(--success-tint)' : 'var(--danger-tint)', color: inviteResult.ok ? 'var(--success)' : 'var(--danger)' }}>
            {inviteResult.ok ? <Icons.Check size={15} /> : <Icons.AlertTriangle size={15} />} {inviteResult.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRoles;
