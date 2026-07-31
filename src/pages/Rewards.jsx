import React, { useState } from "react";
import { supabase } from "../supabase";
import { Icons } from "../components/Icons";

const Rewards = ({ rewards, onChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState({ name: "", pointsCost: "", image: "", isActive: true });

  const openAdd = () => { setForm({ name: "", pointsCost: "", image: "", isActive: true }); setEditMode(false); setShowModal(true); };
  const openEdit = (r) => { setCurrentId(r.id); setForm({ name: r.name, pointsCost: r.pointsCost, image: r.image || "", isActive: r.isActive !== false }); setEditMode(true); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { name: form.name, points_cost: Number(form.pointsCost), image: form.image, is_active: form.isActive };
    if (editMode) await supabase.from('rewards').update(payload).eq('id', currentId);
    else await supabase.from('rewards').insert(payload);
    setShowModal(false);
    onChange && onChange();
  };

  const toggleActive = async (r) => {
    await supabase.from('rewards').update({ is_active: r.isActive === false }).eq('id', r.id);
    onChange && onChange();
  };

  const removeReward = async (r) => {
    if (!window.confirm(`حذف مكافأة "${r.name}"؟`)) return;
    await supabase.from('rewards').delete().eq('id', r.id);
    onChange && onChange();
  };

  return (
    <div className="n-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Icons.Gift size={22} /> المكافآت</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-faint)', fontSize: '13px' }}>الجوايز اللي عملائك يقدروا يستبدلوها بالنقاط</p>
        </div>
        <button className="n-btn n-btn-primary" style={{ padding: '11px 20px' }} onClick={openAdd}><Icons.Plus /> مكافأة جديدة</button>
      </div>

      <div className="n-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>المكافأة</th><th>تكلفة النقاط</th><th style={{ textAlign: 'center' }}>مفعّلة</th><th style={{ textAlign: 'center' }}>إجراءات</th></tr></thead>
          <tbody>
            {rewards.map(r => (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td><span className="stub" style={{ fontSize: '13px', color: 'var(--amber-deep)' }}>{r.pointsCost} نقطة</span></td>
                <td style={{ textAlign: 'center' }}>
                  <button className="tag" style={{ border: 'none', cursor: 'pointer', background: r.isActive === false ? 'var(--danger-tint)' : 'var(--success-tint)', color: r.isActive === false ? 'var(--danger)' : 'var(--success)' }} onClick={() => toggleActive(r)}>
                    {r.isActive === false ? 'متوقفة' : 'مفعّلة'}
                  </button>
                </td>
                <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button className="n-btn n-btn-outline" style={{ padding: '7px 14px', fontSize: '12px' }} onClick={() => openEdit(r)}>تعديل</button>
                  <button className="n-btn n-btn-outline" style={{ padding: '7px 14px', fontSize: '12px', color: 'var(--danger)' }} onClick={() => removeReward(r)}>حذف</button>
                </td>
              </tr>
            ))}
            {rewards.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-faint)' }}>لسه مفيش مكافآت مضافة</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setShowModal(false)}>
          <div className="n-card n-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '100%', margin: '20px', padding: '28px' }}>
            <h2 style={{ marginTop: 0 }}>{editMode ? "تعديل المكافأة" : "مكافأة جديدة"}</h2>
            <form onSubmit={handleSave}>
              <label className="n-label">اسم المكافأة</label>
              <input required className="n-input" style={{ marginBottom: '14px' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: مشروب مجاني" />
              <label className="n-label">تكلفة النقاط</label>
              <input required type="number" className="n-input" style={{ marginBottom: '20px' }} value={form.pointsCost} onChange={e => setForm({ ...form, pointsCost: e.target.value })} />
              <button type="submit" className="n-btn n-btn-primary" style={{ width: '100%', padding: '14px' }}>حفظ</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rewards;
