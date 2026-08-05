import React, { useState, useRef } from "react";
import { supabase, unmapOrderedRow } from "../supabase";
import * as XLSX from 'xlsx';

const LOW_STOCK_THRESHOLD = 5;

const getTemp = () => "cold";
const TAG_CLASS = { cold: "tag-cold", hot: "tag-cold", sweet: "tag-cold" };

const Inventory = ({ products, categories }) => {
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [form, setForm] = useState({ name: "", price: "", category: "", description: "", image: "", status: "متوفر", stock: "", trackStock: false, isCombo: false, comboItems: [], variantGroup: "", variantLabel: "" });
  const [imageUpload, setImageUpload] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("الكل");
  const [selectedIds, setSelectedIds] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [quickPriceId, setQuickPriceId] = useState(null);
  const [quickPriceValue, setQuickPriceValue] = useState("");
  const [bulkPriceMode, setBulkPriceMode] = useState(false);
  const [bulkPriceValues, setBulkPriceValues] = useState({});
  const [bulkAdjustType, setBulkAdjustType] = useState("percent"); // percent | fixed
  const [bulkAdjustDirection, setBulkAdjustDirection] = useState("increase"); // increase | decrease
  const [bulkAdjustAmount, setBulkAdjustAmount] = useState("");

  const roundPrice = (n) => Math.round(n * 4) / 4; // نقرب لأقرب ربع جنيه بدل كسور غريبة

  const applyBulkAdjustment = () => {
    const amount = Number(bulkAdjustAmount);
    if (!amount || amount <= 0) return;
    const sign = bulkAdjustDirection === "increase" ? 1 : -1;
    setBulkPriceValues(prev => {
      const next = { ...prev };
      products.filter(p => selectedIds.includes(p.id)).forEach(p => {
        const base = Number(prev[p.id] ?? p.price);
        const delta = bulkAdjustType === "percent" ? base * (amount / 100) : amount;
        const newPrice = Math.max(0, roundPrice(base + sign * delta));
        next[p.id] = newPrice;
      });
      return next;
    });
  };
  const [bulkSaving, setBulkSaving] = useState(false);
  const [showMoveCategory, setShowMoveCategory] = useState(false);
  const [moveTargetCategory, setMoveTargetCategory] = useState("");
  const [moveSaving, setMoveSaving] = useState(false);

  const applyMoveCategory = async () => {
    if (!moveTargetCategory) return;
    setMoveSaving(true);
    await supabase.from('products').update({ category: moveTargetCategory }).in('id', selectedIds);
    setMoveSaving(false);
    setShowMoveCategory(false);
    setMoveTargetCategory("");
    setSelectedIds([]);
  };
  const [imgUploadTargetId, setImgUploadTargetId] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const quickImageInputRef = useRef(null);

  const openQuickImagePicker = (productId) => {
    setImgUploadTargetId(productId);
    quickImageInputRef.current.click();
  };

  const handleQuickImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !imgUploadTargetId) return;
    setImgUploading(true);
    try {
      const path = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadError) throw uploadError;
      const url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
      await supabase.from('products').update({ image: url }).eq('id', imgUploadTargetId);
    } catch (err) {
      alert("حدث خطأ أثناء رفع الصورة!");
    }
    setImgUploading(false);
    setImgUploadTargetId(null);
    e.target.value = null;
  };

  const startQuickPriceEdit = (p) => {
    setQuickPriceId(p.id);
    setQuickPriceValue(p.price);
  };

  const saveQuickPrice = async (id) => {
    const newPrice = Number(quickPriceValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      await supabase.from('products').update({ price: newPrice }).eq('id', id);
    }
    setQuickPriceId(null);
  };

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

  const startBulkPriceEdit = () => {
    const initial = {};
    products.filter(p => selectedIds.includes(p.id)).forEach(p => { initial[p.id] = p.price; });
    setBulkPriceValues(initial);
    setBulkAdjustAmount("");
    setBulkPriceMode(true);
  };

  const cancelBulkPriceEdit = () => {
    setBulkPriceMode(false);
    setBulkPriceValues({});
    setBulkAdjustAmount("");
  };

  const saveBulkPriceEdit = async () => {
    setBulkSaving(true);
    const updates = Object.entries(bulkPriceValues);
    for (const [id, value] of updates) {
      const newPrice = Number(value);
      if (!isNaN(newPrice) && newPrice >= 0) {
        await supabase.from('products').update({ price: newPrice }).eq('id', id);
      }
    }
    setBulkSaving(false);
    setBulkPriceMode(false);
    setBulkPriceValues({});
    setSelectedIds([]);
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
        variantGroup: form.variantGroup || null,
        variantLabel: form.variantLabel || null,
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
    setForm({ name: "", price: "", category: "", description: "", image: "", status: "متوفر", stock: "", trackStock: false, isCombo: false, comboItems: [], variantGroup: "", variantLabel: "" });
    setImageUpload(null);
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setCurrentId(p.id);
    setForm({ name: p.name, price: p.price, category: p.category, description: p.description || "", image: p.image || "", status: p.status || "متوفر", stock: p.stock ?? "", trackStock: !!p.trackStock, isCombo: !!p.isCombo, comboItems: p.comboItems && p.comboItems.length ? p.comboItems : [], variantGroup: p.variantGroup || "", variantLabel: p.variantLabel || "" });
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
        <h1 className="section-title" style={{ margin: 0 }}>المنيو والمخزون 🧾</h1>
        {lowStockCount > 0 && (
          <span className="tag" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>⚠️ {lowStockCount} صنف على وشك النفاد</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <input placeholder="🔍 ابحث عن منتج..." className="n-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, margin: 0, minWidth: '200px' }} />
        <select className="n-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ width: '200px', margin: 0 }}>
          <option value="الكل">جميع الأقسام 📂</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {bulkPriceMode ? (
            <>
              <button className="n-btn n-btn-primary" style={{ padding: '11px 20px' }} disabled={bulkSaving} onClick={saveBulkPriceEdit}>
                {bulkSaving ? "جاري الحفظ..." : "💾 حفظ الأسعار"}
              </button>
              <button className="n-btn n-btn-outline" style={{ padding: '11px 20px' }} onClick={cancelBulkPriceEdit}>إلغاء</button>
            </>
          ) : selectedIds.length > 0 ? (
            <>
              <button className="n-btn" style={{ background: 'var(--teal)', color: 'white', padding: '11px 20px' }} onClick={startBulkPriceEdit}>✏️ تعديل السعر ({selectedIds.length})</button>
              <button className="n-btn n-btn-outline" style={{ padding: '11px 20px' }} onClick={() => setShowMoveCategory(true)}>📂 نقل لقسم ({selectedIds.length})</button>
              <button className="n-btn" style={{ background: 'var(--danger)', color: 'white', padding: '11px 20px' }} onClick={deleteSelected}>🗑️ حذف ({selectedIds.length})</button>
            </>
          ) : (
            <>
              <button className="n-btn n-btn-primary" style={{ padding: '11px 20px' }} onClick={openAddModal}>+ إضافة منتج</button>
              <button className="n-btn n-btn-outline" style={{ padding: '11px 20px' }} onClick={() => fileInputRef.current.click()}>📥 رفع إكسيل</button>
              <button className="n-btn n-btn-outline" style={{ padding: '11px 20px' }} onClick={downloadTemplate}>📄 قالب</button>
            </>
          )}
        </div>

        {bulkPriceMode && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--teal-tint)', padding: '8px 12px', borderRadius: 'var(--r-md)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--teal-deep)' }}>تعديل جماعي:</span>
            <select className="n-select" style={{ margin: 0, width: 'auto', padding: '8px 10px', fontSize: '12.5px' }} value={bulkAdjustDirection} onChange={e => setBulkAdjustDirection(e.target.value)}>
              <option value="increase">زيادة</option>
              <option value="decrease">نقصان</option>
            </select>
            <input
              type="number" className="n-input" placeholder="القيمة" style={{ margin: 0, width: '90px', padding: '8px 10px', fontSize: '12.5px' }}
              value={bulkAdjustAmount} onChange={e => setBulkAdjustAmount(e.target.value)}
            />
            <select className="n-select" style={{ margin: 0, width: 'auto', padding: '8px 10px', fontSize: '12.5px' }} value={bulkAdjustType} onChange={e => setBulkAdjustType(e.target.value)}>
              <option value="percent">%</option>
              <option value="fixed">ر.س ثابتة</option>
            </select>
            <button className="n-btn n-btn-dark" style={{ padding: '8px 16px', fontSize: '12.5px' }} onClick={applyBulkAdjustment}>تطبيق على الكل</button>
          </div>
        )}
      </div>

      {isLoading && <div style={{ color: 'var(--teal)', fontWeight: 'bold', marginBottom: '10px' }}>جاري التحميل... ⏳</div>}

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
              <th style={{ textAlign: 'center' }}>الظهور 👁️</th>
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
                    <div
                      onClick={() => openQuickImagePicker(p.id)}
                      title="دوس لتغيير الصورة"
                      style={{ width: '68px', height: '68px', borderRadius: '10px', cursor: 'pointer', position: 'relative', overflow: 'hidden', background: 'var(--paper)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {imgUploading && imgUploadTargetId === p.id ? (
                        <div className="n-skeleton" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
                      ) : p.image ? (
                        <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : <span style={{ fontSize: '26px' }}>🖼️</span>}

                      <div style={{
                        position: 'absolute', bottom: '3px', left: '3px', width: '24px', height: '24px', borderRadius: '50%',
                        background: 'var(--ink)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.35)', border: '2px solid var(--paper-raised)'
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td><b>{p.name}</b> {p.isCombo && <span className="tag" style={{ background: 'var(--berry-tint)', color: 'var(--berry-deep)', marginRight: '6px' }}>🎁 عرض</span>}</td>
                  <td><span className={`tag ${TAG_CLASS[temp]}`}>{p.category}</span></td>
                  <td>
                    {bulkPriceMode && selectedIds.includes(p.id) ? (
                      <input
                        type="number" className="n-input" style={{ margin: 0, padding: '6px 10px', width: '90px', fontSize: '13px', borderColor: 'var(--teal)' }}
                        value={bulkPriceValues[p.id] ?? p.price}
                        onChange={e => setBulkPriceValues(prev => ({ ...prev, [p.id]: e.target.value }))}
                      />
                    ) : quickPriceId === p.id ? (
                      <input
                        type="number" autoFocus className="n-input" style={{ margin: 0, padding: '6px 10px', width: '90px', fontSize: '13px' }}
                        value={quickPriceValue}
                        onChange={e => setQuickPriceValue(e.target.value)}
                        onBlur={() => saveQuickPrice(p.id)}
                        onKeyDown={e => { if (e.key === 'Enter') saveQuickPrice(p.id); if (e.key === 'Escape') setQuickPriceId(null); }}
                      />
                    ) : (
                      <span className="stub n-press" style={{ fontSize: '13px', color: 'var(--teal-deep)', cursor: 'pointer' }} title="دوس لتعديل السعر" onClick={() => startQuickPriceEdit(p)}>
                        {p.price} ر.س ✏️
                      </span>
                    )}
                  </td>
                  <td>
                    {p.trackStock ? (
                      <span style={{ fontWeight: '800', fontFamily: 'var(--font-mono)', color: isLow ? 'var(--danger)' : 'var(--ink)' }}>
                        {p.stock} {isLow && '⚠️'}
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
                      {p.isVisible === false ? "🙈 مخفي" : "👁️ ظاهر"}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="n-btn n-btn-ghost" style={{ padding: '6px' }} onClick={() => openEditModal(p)}>✏️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
      <input type="file" accept="image/*" ref={quickImageInputRef} onChange={handleQuickImageChange} style={{ display: 'none' }} />

      {showMoveCategory && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setShowMoveCategory(false)}>
          <div className="n-card n-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px', width: '100%', margin: '20px', padding: '28px' }}>
            <h2 style={{ marginTop: 0 }}>📂 نقل {selectedIds.length} صنف لقسم تاني</h2>
            <label className="n-label">اختر القسم الجديد</label>
            <select className="n-select" style={{ marginBottom: '20px' }} value={moveTargetCategory} onChange={e => setMoveTargetCategory(e.target.value)}>
              <option value="" disabled>-- اختر قسم --</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="n-btn n-btn-primary" style={{ flex: 1, padding: '13px' }} disabled={!moveTargetCategory || moveSaving} onClick={applyMoveCategory}>
                {moveSaving ? "جاري النقل..." : "نقل الآن"}
              </button>
              <button className="n-btn n-btn-outline" style={{ flex: 1, padding: '13px' }} onClick={() => setShowMoveCategory(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setShowModal(false)}>
          <div className="n-card n-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '100%', margin: '20px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>{editMode ? "تعديل بيانات المنتج ✏️" : "إضافة منتج جديد ➕"}</h2>

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
                  🎁 ده كومبو / عرض (مكوّن من أكتر من صنف)
                </label>
                {form.isCombo && (
                  <div>
                    {form.comboItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input className="n-input" style={{ margin: 0, flex: 2 }} placeholder="اسم الصنف (مثال: قهوة تركي)" value={item.name} onChange={e => updateComboItem(idx, 'name', e.target.value)} />
                        <input className="n-input" type="number" min="1" style={{ margin: 0, width: '70px' }} value={item.qty} onChange={e => updateComboItem(idx, 'qty', Number(e.target.value))} />
                        <button type="button" className="n-btn n-btn-danger" style={{ padding: '0 14px' }} onClick={() => removeComboItem(idx)}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="n-btn n-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={addComboItem}>+ إضافة صنف للعرض</button>
                  </div>
                )}
              </div>

              <div className="n-card" style={{ padding: '14px 16px', marginBottom: '15px', boxShadow: 'none', background: 'var(--paper)' }}>
                <label className="n-label" style={{ marginBottom: '10px' }}>🥤 ربط بأحجام تانية (اختياري)</label>
                <p style={{ fontSize: '11.5px', color: 'var(--ink-faint)', margin: '0 0 10px' }}>لو المنتج ده حجم من أحجام صنف تاني، اكتب نفس "اسم المجموعة" في كل الأحجام عشان تظهر في كارت واحد للعميل مع اختيار الحجم.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <input className="n-input" style={{ margin: 0 }} placeholder="اسم المجموعة (مثال: آيس كريم مانجو)" value={form.variantGroup} onChange={e => setForm({ ...form, variantGroup: e.target.value })} />
                  <input className="n-input" style={{ margin: 0 }} placeholder="اسم الحجم (صغير/وسط/كبير)" value={form.variantLabel} onChange={e => setForm({ ...form, variantLabel: e.target.value })} />
                </div>
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
