import React, { useState } from "react";
import { supabase } from "../supabase";

const Icons = {
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
};

const Users = ({ users, onChange, adminRole }) => {
  const [modalMode, setModalMode] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", role: "كاشير", pin: "", status: "نشط" });
  const [search, setSearch] = useState("");

  const openEdit = (u) => {
    setForm({ id: u.id, name: u.name, role: u.role, pin: u.pin, status: u.status });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalMode === 'add') {
      await supabase.rpc('rpc_add_staff', { p_name: form.name, p_role: form.role, p_pin: form.pin });
    } else {
      await supabase.rpc('rpc_update_staff', { p_id: form.id, p_name: form.name, p_role: form.role, p_pin: form.pin, p_photo: form.photo || "" });
    }
    setShowModal(false);
    setForm({ id: "", name: "", role: "كاشير", pin: "", status: "نشط" });
    onChange && onChange();
  };

  const toggleStatus = async (u) => {
    await supabase.rpc('rpc_toggle_staff_status', { p_id: u.id });
    onChange && onChange();
  };

  const removeStaff = async (u) => {
    if (!window.confirm('حذف؟')) return;
    await supabase.rpc('rpc_delete_staff', { p_id: u.id });
    onChange && onChange();
  };

  const filteredUsers = users.filter(u => !search || u.name.includes(search));
  const activeCount = users.filter(u => u.status === "نشط").length;

  return (
    <div className="n-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>فريق العمل 🛡️</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-faint)', fontSize: '13px' }}>{activeCount} من {users.length} نشط حالياً</p>
        </div>
        <button className="n-btn n-btn-dark" style={{ padding: '11px 20px' }} onClick={() => { setModalMode('add'); setForm({ name: "", role: "كاشير", pin: "", status: "نشط" }); setShowModal(true); }}>+ تعيين موظف</button>
      </div>

      <input className="n-input" placeholder="🔍 ابحث عن موظف..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '16px', maxWidth: '320px' }} />

      <div className="n-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>الاسم</th><th>الصلاحية</th><th>رمز PIN</th><th>الحالة</th><th style={{ textAlign: 'center' }}>إجراءات</th></tr></thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id}>
                <td><b>{u.name}</b></td>
                <td><span className={`tag ${u.role === 'مدير' ? 'tag-hot' : 'tag-cold'}`}>{u.role}</span></td>
                <td style={{ letterSpacing: '2px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{u.pin}</td>
                <td>
                  <button onClick={() => toggleStatus(u)} className="tag" style={{ border: 'none', cursor: 'pointer', background: u.status === 'نشط' ? 'var(--success-tint)' : 'var(--danger-tint)', color: u.status === 'نشط' ? 'var(--success)' : 'var(--danger)' }}>
                    {u.status}
                  </button>
                </td>
                <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button className="n-btn n-btn-outline" style={{ padding: '8px' }} onClick={() => openEdit(u)}><Icons.Edit /></button>
                  {adminRole === 'مدير عام' && (
                    <button className="n-btn n-btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => removeStaff(u)}><Icons.Trash /></button>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-faint)' }}>لا يوجد موظفين مطابقين</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setShowModal(false)}>
          <div className="n-card n-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px', width: '100%', margin: '20px', padding: '28px' }}>
            <h2 style={{ marginTop: 0 }}>{modalMode === 'add' ? 'إضافة موظف جديد' : 'تعديل بيانات الموظف'}</h2>
            <form onSubmit={handleSubmit}>
              <label className="n-label">الاسم الكامل</label>
              <input required className="n-input" style={{ marginBottom: '14px' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

              <label className="n-label">الصلاحية</label>
              <select className="n-select" style={{ marginBottom: '14px' }} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="كاشير">كاشير</option>
                <option value="مدير">مدير</option>
              </select>

              <label className="n-label">رمز الدخول (PIN)</label>
              <input required type="number" className="n-input" style={{ textAlign: 'center', letterSpacing: '3px', marginBottom: '18px', fontFamily: 'var(--font-mono)' }} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} />

              <button type="submit" className="n-btn n-btn-primary" style={{ width: '100%', padding: '14px' }}>
                {modalMode === 'add' ? 'إضافة للنظام' : 'حفظ التعديلات'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
