import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";

const AdminRoles = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="n-fade-in">
      <div style={{ marginBottom: '18px' }}>
        <h1 className="section-title" style={{ margin: 0 }}>صلاحيات الإدارة 🛡️</h1>
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
                <td><span className={`tag ${a.role === 'مدير عام' ? 'tag-hot' : 'tag-cold'}`}>{a.role === 'مدير عام' ? '👑' : '🛡️'} {a.role}</span></td>
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

      <div className="n-card" style={{ marginTop: '16px', padding: '16px 20px', background: 'var(--info-tint)', border: 'none' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-soft)', fontWeight: '600' }}>
          💡 عشان تضيف مدير جديد: اطلب منه يفتح <b>Supabase Dashboard → Authentication → Add user</b> بإيميله، وبعدها يسجّل دخول مرة واحدة على /admin — هيظهر هنا تلقائيًا كـ"مشرف" وتقدر ترقّيه.
        </p>
      </div>
    </div>
  );
};

export default AdminRoles;
