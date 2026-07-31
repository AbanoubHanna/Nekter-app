import React, { useState, useRef } from "react";
import { supabase, unmapOrderedRow } from "../supabase";
import * as XLSX from 'xlsx';
import { Icons } from "../components/Icons";

const LOW_STOCK_THRESHOLD = 5;

const getTemp = (categoryName = "") => {
  if (categoryName.includes("ساخن") || categoryName.includes("قهوة")) return "hot";
  if (categoryName.includes("آيس") || categoryName.includes("ايس") || categoryName.includes("حلو")) return "sweet";
  return "cold";
};
const TAG_CLASS = { cold: "tag-cold", hot: "tag-hot", sweet: "tag-sweet" };

const Inventory = ({ products, categories }) => {
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [form, setForm] = useState({ name: "", price: "", category: "", description: "", image: "", status: "متوفر", stock: "", trackStock: false, isCombo: false, comboItems: [] });
  const [imageUpload, setImageUpload] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("الكل");
  const [selectedIds, setSelectedIds] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "الكل" || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = products.filter(p => p.trackStock && Number(p.stock) <= LOW_STOCK_THRESHOLD).length;

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) setSelectedIds([]);
    else setSelectedIds(filteredProducts.map(p => p.id));
  };

  const deleteSelected = async () => {
    if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} منتجات؟`)) {
      setIsLoading(true);
      await supabase.from('products').delete().in('id', selectedIds);
      setSelectedIds([]);
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let finalImageUrl = form.image || "";

      if (imageUpload) {
        const path = `${Date.now()}_${imageUpload.name}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(path, imageUpload);
        if (uploadError) throw uploadError;
        finalImageUrl = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
      }

      const finalData = {
        name: form.name,
        price: Number(form.price),
        category: form.category,
        description: form.description || "",
        image: finalImageUrl,
        status: form.status || "متوفر",
        trackStock: !!form.trackStock,
        stock: form.trackStock ? Number(form.stock || 0) : null,
        isCombo: !!form.isCombo,
        comboItems: form.isCombo ? form.comboItems.filter(i => i.name) : [],
      };

      if (editMode) {
        await supabase.from('products').update(unmapOrderedRow(finalData)).eq('id', currentId);
      } else {
        await supabase.from('products').insert(unmapOrderedRow({ ...finalData, order: products.length + 1 }));
      }
      setShowModal(false);
      setImageUpload(null);
    } catch (error) {
      alert("حدث خطأ أثناء الحفظ!");
      console.error(error);
    }
    setIsLoading(false);
  };

  const downloadTemplate = () => {
    const templateData = [{
      "اسم المنتج": "آيس لاتيه",
      "القسم": "المشروبات الباردة",
      "السعر (ر.س)": 15,
      "وصف المنتج المشوق": "وصف جذاب",
      "رابط الصورة": "/logo.png"
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المنيو");
    XLSX.writeFile(workbook, "Nekter_Template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      const rows = data
        .map((row, i) => {
          const name = row["اسم المنتج"] || row["Name"];
          if (!name) return null;
          return unmapOrderedRow({
            name,
            category: row["القسم"] || row["Category"] || "أصناف متنوعة",
            price: Number(row["السعر (ر.س)"] || row["Price"] || 0),
            description: row["وصف المنتج المشوق"] || row["Description"] || "",
            image: row["رابط الصورة"] || row["Image"] || row["image"] || "",
            status: "متوفر",
            order: products.length + i,
            isVisible: true
          });
        })
        .filter(Boolean);

      if (rows.length > 0) await supabase.from('products').insert(rows);
      setIsLoading(false);
      alert("تم الاستيراد بنجاح!");
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  const openAddModal = () => {
    setForm({ name: "", price: "", category: "", description: "", image: "", status: "متوفر", stock: "", trackStock: false, isCombo: false, comboItems: [] });
    setImageUpload(null);
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setCurrentId(p.id);
    setForm({ name: p.name, price: p.price, category: p.category, description: p.description || "", image: p.image || "", status: p.status || "متوفر", stock: p.stock ?? "", trackStock: !!p.trackStock, isCombo: !!p.isCombo, comboItems: p.comboItems && p.comboItems.length ? p.comboItems : [] });
    setImageUpload(null);
    setEditMode(true);
    setShowModal(true);
  };

  const addComboItem = () => setForm(f => ({ ...f, comboItems: [...f.comboItems, { name: "", qty: 1 }] }));
  const updateComboItem = (idx, field, value) => setForm(f => ({ ...f, comboItems: f.comboItems.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));
  const removeComboItem = (idx) => setForm(f => ({ ...f, comboItems: f.comboItems.filter((_, i) => i !== idx) }));

  const toggleAvailability = async (p) => {
    const nextStatus = p.status === "نفذت" ? "متوفر" : "نفذت";
    await supabase.from('products').update({ status: nextStatus }).eq('id', p.id);
  };

  return (
    <div className="n-card n-fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', padding: '25px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Icons.Receipt size={22} /> المنيو والمخزون</h1>
        {lowStockCount > 0 && (
          <span className="tag" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}><Icons.AlertTriangle /> {lowStockCount} صنف على وشك النفاد</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <input placeholder="ابحث عن منتج..." className="n-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, margin: 0, minWidth: '200px' }} />
        <select className="n-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ width: '200px', margin: 0 }}>
          <option value="الكل">جميع الأقسام</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedIds.length > 0 ? (
            <button className="n-btn" style={{ background: 'var(--danger)', color: 'white', padding: '11px 20px' }} onClick={deleteSelected}><Icons.Trash /> حذف ({selectedIds.length})</button>
          ) : (
            <>
              <button className="n-btn n-btn-primary" style={{ padding: '11px 20px' }} onClick={openAddModal}><Icons.Plus /> إضافة منتج</button>
              <button className="n-btn n-btn-outline" style={{ padding: '11px 20px' }} onClick={() => fileInputRef.current.click()}><Icons.Upload /> رفع إكسيل</button>
              <button className="n-btn n-btn-outline" style={{ padding: '11px 20px' }} onClick={downloadTemplate}><Icons.Receipt size={16} /> قالب</button>
            </>
          )}
        </div>
      </div>

      {isLoading && <div style={{ color: 'var(--teal)', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Clock size={14} /> جاري التحميل...</div>}

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}>
        <table>
          <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--paper)' }}>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={toggleSelectAll} />
              </th>
              <th>الصورة</th>
              <th>المنتج</th>
              <th>القسم</th>
              <th>السعر</th>
              <th>المخزون</th>
              <th style={{ textAlign: 'center' }}>التوفر</th>
              <th style={{ textAlign: 'center' }}>الظهور</th>
              <th style={{ textAlign: 'center' }}>تعديل</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => {
              const temp = getTemp(p.category);
              const isLow = p.trackStock && Number(p.stock) <= LOW_STOCK_THRESHOLD;
              return (
                <tr key={p.id} style={{ background: selectedIds.includes(p.id) ? 'var(--teal-tint)' : (p.isVisible === false ? 'var(--paper)' : 'transparent'), opacity: p.isVisible === false ? 0.6 : 1 }}>
                  <td style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleSelect(p.id)}>
                    <input type="checkbox" checked={selectedIds.includes(p.id)} readOnly style={{ pointerEvents: 'none' }} />
                  </td>
                  <td>
                    {p.image ? <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} /> : <span style={{ color: 'var(--ink-faint)' }}><Icons.Image size={20} /></span>}
                  </td>
                  <td><b>{p.name}</b> {p.isCombo && <span className="tag" style={{ background: 'var(--berry-tint)', color: 'var(--berry-deep)', marginRight: '6px' }}><Icons.Gift size={12} /> عرض</span>}</td>
                  <td><span className={`tag ${TAG_CLASS[temp]}`}>{p.category}</span></td>
                  <td><span className="stub" style={{ fontSize: '13px', color: 'var(--teal-deep)' }}>{p.price} ر.س</span></td>
                  <td>
                    {p.trackStock ? (
                      <span style={{ fontWeight: '800', color: isLow ? 'var(--danger)' : 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {p.stock} {isLow && <Icons.AlertTriangle size={13} />}
                      </span>
                    ) : <span style={{ color: 'var(--ink-faint)', fontSize: '12px' }}>غير متتبَّع</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => toggleAvailability(p)}
                      className="tag" style={{ border: 'none', cursor: 'pointer', background: p.status === "نفذت" ? 'var(--danger-tint)' : 'var(--success-tint)', color: p.status === "نفذت" ? 'var(--danger)' : 'var(--success)' }}
                    >
                      {p.status === "نفذت" ? "نفذت" : "متوفر"}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={async () => await supabase.from('products').update({ is_visible: p.isVisible === false ? true : false }).eq('id', p.id)}
                      className="tag" style={{ border: 'none', cursor: 'pointer', background: p.isVisible === false ? 'var(--danger-tint)' : 'var(--success-tint)', color: p.isVisible === false ? 'var(--danger)' : 'var(--success)' }}
                    >
                      {p.isVisible === false ? <><Icons.EyeOff size={13} /> مخفي</> : <><Icons.Eye size={13} /> ظاهر</>}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="n-btn n-btn-ghost" style={{ padding: '6px' }} onClick={() => openEditModal(p)}><Icons.Edit size={16} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

      {showModal && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setShowModal(false)}>
          <div className="n-card n-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '100%', margin: '20px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>{editMode ? <><Icons.Edit size={18} /> تعديل بيانات المنتج</> : <><Icons.Plus size={18} /> إضافة منتج جديد</>}</h2>

            <form onSubmit={handleSave}>
              <div style={{ background: 'var(--paper)', padding: '16px', borderRadius: 'var(--r-lg)', border: '1px dashed var(--line)', marginBottom: '16px' }}>
                <label className="n-label">إضافة صورة للمنتج (اختر طريقة واحدة):</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--ink-faint)', display: 'block', marginBottom: '5px' }}>1. مسار الصورة (أو تتسحب من الإكسيل)</label>
                    <input className="n-input" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="مثال: /coffee.png" style={{ margin: 0, padding: '10px', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--ink-faint)', display: 'block', marginBottom: '5px' }}>2. أو ارفع صورة من جهازك</label>
                    <input type="file" accept="image/*" onChange={(e) => setImageUpload(e.target.files[0])} style={{ width: '100%', margin: 0, padding: '7px', background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }} />
                  </div>
                </div>
                {form.image && !imageUpload && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>الصورة الحالية:</span>
                    <img src={form.image} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--line)' }} />
                  </div>
                )}
              </div>

              <label className="n-label">الاسم</label>
              <input required className="n-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ marginBottom: '15px' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label className="n-label">السعر</label>
                  <input type="number" required className="n-input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} step="0.01" />
                </div>
                <div>
                  <label className="n-label">القسم</label>
                  <select required className="n-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="" disabled>-- اختر --</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="n-card" style={{ padding: '14px 16px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'none', background: 'var(--paper)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '13.5px', color: 'var(--ink)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.trackStock} onChange={e => setForm({ ...form, trackStock: e.target.checked })} />
                  تتبّع كمية المخزون لهذا الصنف
                </label>
                {form.trackStock && (
                  <input type="number" className="n-input" style={{ width: '110px', margin: 0 }} placeholder="الكمية" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                )}
              </div>

              <div className="n-card" style={{ padding: '14px 16px', marginBottom: '15px', boxShadow: 'none', background: 'var(--paper)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '13.5px', color: 'var(--ink)', cursor: 'pointer', marginBottom: form.isCombo ? '14px' : 0 }}>
                  <input type="checkbox" checked={form.isCombo} onChange={e => setForm({ ...form, isCombo: e.target.checked })} />
                  <Icons.Gift size={15} /> ده كومبو / عرض (مكوّن من أكتر من صنف)
                </label>
                {form.isCombo && (
                  <div>
                    {form.comboItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input className="n-input" style={{ margin: 0, flex: 2 }} placeholder="اسم الصنف (مثال: قهوة تركي)" value={item.name} onChange={e => updateComboItem(idx, 'name', e.target.value)} />
                        <input className="n-input" type="number" min="1" style={{ margin: 0, width: '70px' }} value={item.qty} onChange={e => updateComboItem(idx, 'qty', Number(e.target.value))} />
                        <button type="button" className="n-btn n-btn-danger" style={{ padding: '0 14px' }} onClick={() => removeComboItem(idx)}><Icons.Close size={14} /></button>
                      </div>
                    ))}
                    <button type="button" className="n-btn n-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={addComboItem}><Icons.Plus size={14} /> إضافة صنف للعرض</button>
                  </div>
                )}
              </div>

              <label className="n-label">الوصف التسويقي</label>
              <textarea className="n-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="مثال: مشروب منعش بمزيج من..." style={{ minHeight: '80px', marginBottom: '20px' }} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="n-btn n-btn-primary" style={{ flex: 1, padding: '14px' }} disabled={isLoading}>{isLoading ? "جاري الحفظ..." : "حفظ المنتج"}</button>
                <button type="button" className="n-btn n-btn-outline" style={{ flex: 1, padding: '14px' }} onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
