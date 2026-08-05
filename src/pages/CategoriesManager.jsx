import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Icons } from "../components/Icons";

const CategoriesManager = ({ categories, products }) => {
  const [selectedCat, setSelectedCat] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [tempCategories, setTempCategories] = useState([]);
  const [tempProducts, setTempProducts] = useState([]);
  const [draggedCatIndex, setDraggedCatIndex] = useState(null);
  const [draggedProdIndex, setDraggedProdIndex] = useState(null);

  useEffect(() => {
    if (!isEditMode) {
      const productCatNames = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
      const registeredNames = categories.map(c => c.name);
      const missingCats = productCatNames
        .filter(name => !registeredNames.includes(name))
        .map(name => ({ id: `temp_${name}`, name, order: 999, isTemp: true }));

      setTempCategories([...categories, ...missingCats].sort((a, b) => (a.order || 0) - (b.order || 0)));
      setTempProducts([...products].sort((a, b) => (a.order || 0) - (b.order || 0)));
    }
  }, [categories, products, isEditMode]);

  // دالة الإخفاء السريع للقسم
  const toggleCatVisibility = async (cat, e) => {
    e.stopPropagation();
    if (cat.isTemp) return alert("يرجى حفظ القسم أولاً قبل إخفائه.");
    const newStatus = cat.isVisible !== false ? false : true;
    await supabase.from('categories').update({ is_visible: newStatus }).eq('id', cat.id);
  };

  // دالة الإخفاء السريع للمنتج
  const toggleProdVisibility = async (prod, e) => {
    e.stopPropagation();
    const newStatus = prod.isVisible !== false ? false : true;
    await supabase.from('products').update({ is_visible: newStatus }).eq('id', prod.id);
  };

  const handleSaveAll = async () => {
    try {
      const newCats = tempCategories.filter(c => c.isTemp).map((cat) => ({
        name: cat.name,
        position: tempCategories.findIndex(c => c.id === cat.id),
        is_visible: cat.isVisible !== false
      }));
      const existingCatUpdates = tempCategories
        .filter(c => !c.isTemp)
        .map((cat, ) => supabase.from('categories').update({
          name: cat.name,
          position: tempCategories.findIndex(c => c.id === cat.id),
          is_visible: cat.isVisible !== false
        }).eq('id', cat.id));

      const productUpdates = tempProducts.map((prod, index) =>
        supabase.from('products').update({
          name: prod.name,
          position: index,
          category: prod.category,
          is_visible: prod.isVisible !== false
        }).eq('id', prod.id)
      );

      if (newCats.length > 0) await supabase.from('categories').insert(newCats);
      await Promise.all([...existingCatUpdates, ...productUpdates]);

      setIsEditMode(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (error) {
      alert("حدث خطأ أثناء الحفظ!");
      console.error(error);
    }
  };

  const onCatDragOver = (index) => {
    if (draggedCatIndex === null || draggedCatIndex === index) return;
    const newList = [...tempCategories];
    const draggedItem = newList.splice(draggedCatIndex, 1)[0];
    newList.splice(index, 0, draggedItem);
    setDraggedCatIndex(index);
    setTempCategories(newList);
  };

  const onProdDragOver = (index, filteredProds) => {
    if (draggedProdIndex === null) return;
    const actualDraggedIndex = tempProducts.findIndex(p => p.id === filteredProds[draggedProdIndex].id);
    const actualTargetIndex = tempProducts.findIndex(p => p.id === filteredProds[index].id);
    const newList = [...tempProducts];
    const draggedItem = newList.splice(actualDraggedIndex, 1)[0];
    newList.splice(actualTargetIndex, 0, draggedItem);
    setDraggedProdIndex(index);
    setTempProducts(newList);
  };

  return (
    <div className="n-fade-in" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 160px)', position: 'relative' }}>
      
      {/* عمود الأقسام */}
      <div className="n-card" style={{ width: '380px', display: 'flex', flexDirection: 'column', padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.Folder size={16} /> الأقسام</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isEditMode ? (
              <button className="n-btn n-btn-dark" onClick={() => setIsEditMode(true)} style={{ padding: '8px 14px', fontSize: '12px' }}><Icons.Edit size={14} /> تعديل الترتيب</button>
            ) : (
              <>
                <button className="n-btn n-btn-primary" onClick={handleSaveAll} style={{ padding: '8px 14px', fontSize: '12px' }}><Icons.Save size={14} /> حفظ</button>
                <button className="n-btn n-btn-outline" onClick={() => setIsEditMode(false)} style={{ padding: '8px 14px', fontSize: '12px' }}>إلغاء</button>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
          {tempCategories.map((cat, index) => (
            <div 
              key={cat.id} 
              draggable={isEditMode}
              onDragStart={() => setDraggedCatIndex(index)}
              onDragOver={(e) => { e.preventDefault(); onCatDragOver(index); }}
              onDragEnd={() => setDraggedCatIndex(null)}
              onClick={() => !isEditMode && setSelectedCat(cat.name)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', 
                background: cat.isVisible === false ? 'var(--paper)' : (selectedCat === cat.name ? 'var(--teal-tint)' : 'var(--paper)'),
                borderRadius: 'var(--r-md)', marginBottom: '8px', border: '1.5px solid',
                borderColor: selectedCat === cat.name ? 'var(--teal)' : 'var(--line)',
                cursor: isEditMode ? 'grab' : 'pointer', 
                opacity: cat.isVisible === false ? 0.6 : (draggedCatIndex === index ? 0.5 : 1),
                transition: '0.2s'
              }}
            >
              {isEditMode && <span style={{ color: 'var(--ink-faint)', cursor: 'grab' }}><Icons.ArrowUpDown size={14} /></span>}
              {isEditMode ? (
                <input 
                  className="n-input"
                  value={cat.name} 
                  onChange={(e) => {
                    const newList = [...tempCategories];
                    const oldName = newList[index].name;
                    newList[index].name = e.target.value;
                    setTempCategories(newList);
                    setTempProducts(tempProducts.map(p => p.category === oldName ? {...p, category: e.target.value} : p));
                  }} 
                  style={{ flex: 1, height: '35px', fontSize: '14px', margin: 0, padding: '0 10px' }} 
                />
              ) : (
                <>
                  <b style={{ fontSize: '15px', flex: 1, color: selectedCat === cat.name ? 'var(--ink)' : 'var(--ink-soft)' }}>
                    {cat.name} {cat.isVisible === false && <span style={{ fontSize: '10px', color: 'var(--danger)' }}>(مخفي)</span>}
                  </b>
                  <button 
                    onClick={(e) => toggleCatVisibility(cat, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                    title={cat.isVisible === false ? "إظهار القسم" : "إخفاء القسم"}
                  >
                    {cat.isVisible === false ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* عمود المنتجات */}
      <div className="n-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '22px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '15px', margin: '0 0 15px 0', color: 'var(--ink)' }}>
          منتجات: <span style={{ color: 'var(--teal)' }}>{selectedCat || "يرجى اختيار قسم"}</span>
        </h3>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
          {selectedCat ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tempProducts.filter(p => p.category === selectedCat).map((p, index, filteredArr) => (
                <div 
                  key={p.id} 
                  draggable={isEditMode}
                  onDragStart={() => setDraggedProdIndex(index)}
                  onDragOver={(e) => { e.preventDefault(); onProdDragOver(index, filteredArr); }}
                  onDragEnd={() => setDraggedProdIndex(null)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px',
                    background: p.isVisible === false ? 'var(--paper)' : 'var(--paper)',
                    borderRadius: 'var(--r-md)', border: '1px solid var(--line)',
                    cursor: isEditMode ? 'grab' : 'default', 
                    opacity: p.isVisible === false ? 0.6 : (draggedProdIndex === index ? 0.5 : 1),
                    transition: '0.2s'
                  }}
                >
                  <span style={{ color: 'var(--line)' }}>{isEditMode ? <Icons.ArrowUpDown size={14} /> : <Icons.Coffee size={14} />}</span>
                  {isEditMode ? (
                    <input 
                      className="n-input"
                      value={p.name} 
                      onChange={(e) => {
                        const newList = [...tempProducts];
                        const actualIdx = newList.findIndex(item => item.id === p.id);
                        newList[actualIdx].name = e.target.value;
                        setTempProducts(newList);
                      }}
                      style={{ flex: 1, height: '35px', background: 'var(--paper-raised)', margin: 0, padding: '0 10px' }}
                    />
                  ) : (
                    <>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <b style={{ fontSize: '15px', color: 'var(--ink)', unicodeBidi: 'plaintext' }}>{p.name}</b>
                        {p.isVisible === false && <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 'bold' }}>مخفي من المنيو</span>}
                      </div>
                      
                      <button 
                        onClick={(e) => toggleProdVisibility(p, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', marginRight: '10px' }}
                        title={p.isVisible === false ? "إظهار المنتج" : "إخفاء المنتج"}
                      >
                        {p.isVisible === false ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                      </button>

                      <span className="stub" style={{ fontSize: '13px', color: 'var(--teal-deep)' }}>{p.price} ر.س</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', flexDirection: 'column', gap: '10px' }}>
              <Icons.ArrowRight size={32} />
              <b>اختر قسماً من اليمين لعرض أو تعديل منتجاته</b>
            </div>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="sheet-overlay" style={{ alignItems: 'center', background: 'rgba(22,33,58,0.4)' }}>
          <div className="n-card n-fade-in" style={{ maxWidth: '300px', textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ 
              width: '70px', height: '70px', background: 'var(--success-tint)', color: 'var(--success)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <Icons.Check size={34} />
            </div>
            <h2 style={{ fontSize: '20px', color: 'var(--ink)', marginBottom: '10px' }}>تم الحفظ بنجاح</h2>
            <p style={{ color: 'var(--ink-faint)', fontSize: '14px', marginBottom: '20px' }}>تم تحديث المنيو والترتيب في جميع الشاشات.</p>
            <button className="n-btn n-btn-primary" style={{ width: '100%', padding: '13px' }} onClick={() => setShowSuccess(false)}>
              موافق
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CategoriesManager;