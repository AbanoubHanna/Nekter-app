import React, { useState, useEffect } from "react";
import { supabase, mapOrderedRow, toSnakeRow, optimizedImageUrl } from "../supabase";
import { useLocation } from "react-router-dom";
import ConfettiBurst from "../components/ConfettiBurst";
import "../styles/theme.css";

const Icons = {
  Menu: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>,
  Orders: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  User: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Phone: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>,
  Call: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Cart: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 2-1.58l1.65-7.39H5.12"/></svg>,
};

// --- single brand accent (teal) for all categories, matching the original identity ---
const getTemp = () => "cold";
const TEMP_STYLE = {
  cold:  { tag: "tag-cold",  accent: "var(--teal)",  deep: "var(--teal-deep)" },
  hot:   { tag: "tag-cold",  accent: "var(--teal)",  deep: "var(--teal-deep)" },
  sweet: { tag: "tag-cold",  accent: "var(--teal)",  deep: "var(--teal-deep)" },
};

// group products that share a variant_group (different sizes of the same item)
// into a single display card with a size picker; anything without a group
// (or the only member of its group) renders exactly as before.
const buildDisplayItems = (productList) => {
  const groups = {};
  const standalone = [];
  productList.forEach(p => {
    if (p.variantGroup) {
      (groups[p.variantGroup] = groups[p.variantGroup] || []).push(p);
    } else {
      standalone.push(p);
    }
  });

  const items = standalone.map(p => ({ key: p.id, isGrouped: false, variants: [p] }));
  Object.entries(groups).forEach(([key, variants]) => {
    if (variants.length === 1) {
      items.push({ key: variants[0].id, isGrouped: false, variants });
    } else {
      items.push({ key, isGrouped: true, variants: variants.sort((a, b) => a.price - b.price) });
    }
  });
  return items;
};

const GlobalStyle = () => (
  <style>{`
    body { margin: 0; background-color: var(--paper); direction: rtl; padding-bottom: 130px; color: var(--ink); }
    .hero-wrap { position: relative; border-radius: 0 0 32px 32px; overflow: hidden; box-shadow: var(--shadow-md); margin-bottom: 22px; }
    .hero-top { background: var(--ink); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
    .hero-body { background: linear-gradient(135deg, var(--teal) 0%, var(--teal-deep) 100%); padding: 34px 20px 42px; text-align: center; }
    .cat-rail { display: flex; gap: 10px; overflow-x: auto; padding: 0 20px 18px; scrollbar-width: none; }
    .cat-rail::-webkit-scrollbar { display: none; }
    .cat-chip { flex-shrink: 0; padding: 10px 20px; border-radius: var(--r-full); font-weight: 800; font-size: 14px; white-space: nowrap; cursor: pointer; border: 1.5px solid var(--line); background: var(--paper-raised); color: var(--ink-soft); transition: 0.2s; }
    .cat-chip.active { background: var(--ink); color: white; border-color: var(--ink); }
    .section-head { padding: 4px 20px; display: flex; justify-content: space-between; align-items: baseline; margin: 22px 0 12px; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; padding: 0 20px; }
    .product-card { background: var(--paper-raised); border-radius: var(--r-lg); border: 1px solid var(--line); overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-sm); transition: 0.2s; }
    .product-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .product-img-wrap { position: relative; aspect-ratio: 1 / 1; background: var(--paper); }
    .product-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    @media (min-width: 640px) { .products-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; } }
    .qty-pill { display: flex; align-items: center; background: var(--paper); border-radius: var(--r-full); border: 1.5px solid var(--line); }
    .qty-btn { width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; }
    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--paper-raised); height: 78px; display: flex; justify-content: space-around; align-items: center; box-shadow: 0 -8px 24px rgba(22,33,58,0.06); z-index: 1000; border-top: 1px solid var(--line); }
    .nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--ink-faint); cursor: pointer; transition: 0.2s; font-size: 12px; font-weight: 800; }
    .nav-item.active { color: var(--teal); }
    .order-ticket { background: var(--paper-raised); border-radius: var(--r-lg); padding: 22px; margin-bottom: 18px; border: 1px solid var(--line); box-shadow: var(--shadow-sm); }
    .progress-rail { position: relative; margin: 28px 4px; }
    .progress-line-bg { position: absolute; top: 14px; right: 0; left: 0; height: 3px; background: var(--line); border-radius: 3px; }
    .progress-line-fg { position: absolute; top: 14px; right: 0; height: 3px; background: var(--teal); border-radius: 3px; transition: width 0.5s; }
    .progress-steps { display: flex; justify-content: space-between; position: relative; }
    .progress-dot { width: 29px; height: 29px; border-radius: 50%; border: 3px solid var(--line); background: var(--paper-raised); display: flex; align-items: center; justify-content: center; z-index: 2; transition: 0.3s; }
    .progress-dot.done { border-color: var(--teal); }
    .sheet-overlay { position: fixed; inset: 0; background: rgba(22,33,58,0.7); backdrop-filter: blur(2px); z-index: 2000; display: flex; align-items: flex-end; justify-content: center; }
    .sheet { background: var(--paper-raised); width: 100%; max-width: 520px; border-radius: 32px 32px 0 0; padding: 28px; max-height: 92vh; overflow-y: auto; }
  `}</style>
);

const CustomerView = () => {
  const [view, setView] = useState("menu");
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartBounce, setCartBounce] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);

  const [customerName, setCustomerName] = useState(localStorage.getItem("nekterCustomerName") || "");
  const [customerPhone, setCustomerPhone] = useState(localStorage.getItem("nekterCustomerPhone") || "");
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("شبكة");
  const [ordersHistory, setOrdersHistory] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [redeemedCode, setRedeemedCode] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState({}); // groupKey -> product id

  const { search } = useLocation();
  const tableNumber = new URLSearchParams(search).get("table") || "1";
  const TRACKING_STEPS = ["تم الاستلام", "تم الدفع", "يتم التحضير", "جاهز للاستلام"];

  const getStepIndex = (status) => {
    let s = status;
    if (s === "جديد") s = "تم الاستلام";
    if (s === "التحضير" || s === "جاري التحضير" || s === "جاري التجهيز") s = "يتم التحضير";
    if (s === "جاهز") s = "جاهز للاستلام";
    const idx = TRACKING_STEPS.indexOf(s);
    return idx !== -1 ? idx : (s === "مكتمل" ? 3 : 0);
  };

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error || !mounted) return;
      const pList = data.map(mapOrderedRow);
      const visibleProducts = pList.filter(p => p.isVisible !== false && p.status !== "نفذت");
      setProducts(visibleProducts.sort((a, b) => (a.order || 0) - (b.order || 0)));
      setLoading(false);
    };

    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error || !mounted) return;
      const catsData = data.map(mapOrderedRow);
      const visibleCats = catsData.filter(c => c.isVisible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
      setDbCategories(visibleCats);
    };

    const fetchOrders = async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error || !mounted) return;
      const allOrders = data.map(mapOrderedRow);
      setOrdersHistory(allOrders);
      if (customerPhone) {
        const totalSpent = allOrders
          .filter(o => o.customerPhone === customerPhone)
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        setUserPoints(Math.floor(totalSpent / 10));
      }
    };

    const fetchRewards = async () => {
      const { data, error } = await supabase.from('rewards').select('*').eq('is_active', true);
      if (error || !mounted) return;
      setRewards(data.map(mapOrderedRow).sort((a, b) => a.pointsCost - b.pointsCost));
    };

    const fetchRedemptions = async () => {
      if (!customerPhone) { setRedemptions([]); return; }
      const { data, error } = await supabase.from('loyalty_redemptions').select('*').eq('customer_phone', customerPhone).order('created_at', { ascending: false });
      if (error || !mounted) return;
      setRedemptions(data.map(mapOrderedRow));
    };

    fetchProducts();
    fetchCategories();
    fetchOrders();
    fetchRewards();
    fetchRedemptions();

    const channel = supabase.channel('customer-view-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, fetchRewards)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loyalty_redemptions' }, fetchRedemptions)
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [customerPhone]);

  const spentPoints = redemptions.reduce((s, r) => s + (r.pointsCost || 0), 0);
  const availablePoints = Math.max(0, userPoints - spentPoints);

  const redeemReward = async (reward) => {
    if (availablePoints < reward.pointsCost) return;
    if (!window.confirm(`استبدال ${reward.pointsCost} نقطة بـ "${reward.name}"؟`)) return;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from('loyalty_redemptions').insert(toSnakeRow({
      customerPhone, rewardId: reward.id, rewardName: reward.name, pointsCost: reward.pointsCost, code,
    }));
    if (!error) setRedeemedCode({ code, name: reward.name });
  };

  const cartTotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const handleAddToCart = (p) => {
    const ex = cart.find(x => x.id === p.id);
    setCart(ex ? cart.map(x => x.id === p.id ? { ...ex, qty: ex.qty + 1 } : x) : [...cart, { ...p, qty: 1 }]);
    setShowToast(true); setTimeout(() => setShowToast(false), 1800);
    setCartBounce(false);
    requestAnimationFrame(() => setCartBounce(true));
  };

  const handleRemove = (p) => {
    const ex = cart.find(x => x.id === p.id);
    if (ex) setCart(ex.qty === 1 ? cart.filter(x => x.id !== p.id) : cart.map(x => x.id === p.id ? { ...ex, qty: ex.qty - 1 } : x));
  };

  const handleOrderAgain = (oldItems) => {
    setCart(oldItems);
    setView("menu");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  const dbCatNames = dbCategories.map(c => c.name);
  const dynamicCats = [...new Set(products.map(p => p.category).filter(Boolean))];
  const missingCats = dynamicCats.filter(c => !dbCatNames.includes(c));
  const categories = ["الكل", ...dbCatNames, ...missingCats];

  const filtered = (activeCategory === "الكل" ? products : products.filter(p => p.category === activeCategory)).filter(p => !p.isCombo);
  const grouped = filtered.reduce((acc, p) => { (acc[p.category] = acc[p.category] || []).push(p); return acc; }, {});

  const submitOrder = async () => {
    if (!customerName || !customerPhone) return alert("فضلاً أدخل اسمك ورقم جوالك لنتمكن من خدمتك");
    localStorage.setItem("nekterCustomerName", customerName);
    localStorage.setItem("nekterCustomerPhone", customerPhone);
    await supabase.from('orders').insert(toSnakeRow({
      items: cart, total: cartTotal, customerName, customerPhone, tableNumber, notes: orderNotes,
      paymentMethod, status: "تم الاستلام",
    }));
    setCart([]); setIsCheckoutOpen(false);
    setShowOrderSuccess(true);
    setTimeout(() => { setShowOrderSuccess(false); setView("orders"); }, 1900);
  };

  const myOrders = ordersHistory.filter(o => o.customerPhone === customerPhone);

  return (
    <div>
      <GlobalStyle />
      {view === "menu" ? (
        <>
          <div className="hero-wrap n-rise">
            <div className="hero-top">
              <span className="stub" style={{ '--stub-bg': 'var(--ink)', '--notch-bg': 'var(--ink)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>📍 طاولة {tableNumber}</span>
              <span className="stub" style={{ '--stub-bg': 'var(--teal-deep)', '--notch-bg': 'var(--ink)', color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>⭐ {availablePoints} نقطة</span>
            </div>
            <div className="hero-body">
              <img src="/logo.png" alt="Nekter" style={{ height: '80px', objectFit: 'contain', marginBottom: '16px' }} />
              <p style={{ color: 'white', fontSize: '17px', fontWeight: '700', margin: 0, opacity: 0.95 }}>اطلب من مكانك.. ويوصلك لحد طاولتك</p>
            </div>
          </div>

          <div className="cat-rail">
            {categories.map(c => (
              <div key={c} className={`cat-chip ${activeCategory === c ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>{c}</div>
            ))}
          </div>

          {!loading && activeCategory === "الكل" && products.some(p => p.isCombo) && (
            <div className="n-rise" style={{ '--d': '20ms' }}>
              <div className="section-head">
                <h2 style={{ fontSize: '21px', fontWeight: '900', color: 'var(--berry-deep)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎁 عروض وكومبوهات
                </h2>
              </div>
              <div className="combo-rail">
                {products.filter(p => p.isCombo).map((p, idx) => {
                  const qty = cart.find(x => x.id === p.id)?.qty || 0;
                  return (
                    <div key={p.id} className="product-card combo-card n-rise n-hover-lift" style={{ '--d': `${idx * 50}ms`, minWidth: '260px', maxWidth: '260px', flexShrink: 0, position: 'relative' }}>
                      <span className="combo-ribbon">عرض خاص</span>
                      <div className="product-img-wrap">
                        <img src={p.image ? optimizedImageUrl(p.image, 400) : '/logo.png'} className="product-img" alt={p.name} loading="lazy" />
                      </div>
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--ink)', unicodeBidi: 'plaintext' }}>{p.name}</h3>
                        {p.comboItems?.length > 0 && (
                          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--berry-deep)', fontWeight: '700', lineHeight: '1.5' }}>
                            {p.comboItems.map(i => `${i.qty}x ${i.name}`).join(' + ')}
                          </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span className="stub" style={{ color: 'var(--berry-deep)', fontSize: '15px' }}>{p.price} ر.س</span>
                          <div className="qty-pill">
                            <button className="qty-btn n-press" style={{ background: 'var(--berry)' }} onClick={() => handleAddToCart(p)}><Icons.Plus /></button>
                            <span style={{ width: '26px', textAlign: 'center', fontWeight: '900' }}>{qty}</span>
                            <button className="qty-btn" style={{ background: 'var(--paper-raised)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }} disabled={!qty} onClick={() => handleRemove(p)}><Icons.Minus /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loading && (
            <div className="products-grid">
              {[1, 2, 3, 4].map(i => <div key={i} className="n-skeleton" style={{ height: '180px' }} />)}
            </div>
          )}

          {!loading && categories.filter(c => c !== "الكل" && grouped[c]).map((cat, catIdx) => {
            const temp = getTemp(cat);
            const style = TEMP_STYLE[temp];
            return (
              <div key={cat} className="n-rise" style={{ '--d': `${catIdx * 70}ms` }}>
                <div className="section-head">
                  <h2 style={{ fontSize: '21px', fontWeight: '900', color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: style.accent }} /> {cat}
                  </h2>
                  <span className={`tag ${style.tag}`}>{grouped[cat].length} صنف</span>
                </div>
                <div className="products-grid">
                  {buildDisplayItems(grouped[cat]).map((item, pIdx) => {
                    if (!item.isGrouped) {
                      const p = item.variants[0];
                      const qty = cart.find(x => x.id === p.id)?.qty || 0;
                      return (
                        <div key={item.key} className="product-card n-rise n-hover-lift" style={{ '--d': `${catIdx * 70 + pIdx * 40}ms` }}>
                          <div className="product-img-wrap">
                            <img src={p.image ? optimizedImageUrl(p.image, 400) : '/logo.png'} className="product-img" alt={p.name} loading="lazy" />
                          </div>
                          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--ink)', unicodeBidi: 'plaintext' }}>{p.name}</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-faint)', lineHeight: '1.5', flex: 1 }}>{p.description}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <span className="stub" style={{ color: style.deep, fontSize: '15px' }}>{p.price} ر.س</span>
                              <div className="qty-pill">
                                <button className="qty-btn n-press" style={{ background: style.accent }} onClick={() => handleAddToCart(p)}><Icons.Plus /></button>
                                <span style={{ width: '26px', textAlign: 'center', fontWeight: '900' }}>{qty}</span>
                                <button className="qty-btn" style={{ background: 'var(--paper-raised)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }} disabled={!qty} onClick={() => handleRemove(p)}><Icons.Minus /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // grouped size-variant card
                    const activeId = selectedVariant[item.key] || item.variants[0].id;
                    const active = item.variants.find(v => v.id === activeId) || item.variants[0];
                    const qty = cart.find(x => x.id === active.id)?.qty || 0;
                    const baseName = active.name.replace(/\s*[\(-]\s*(صغير|وسط|كبير|عائلي|S|M|L|XL)\s*\)?\s*$/i, '').trim();
                    const groupImage = item.variants.find(v => v.image)?.image;
                    return (
                      <div key={item.key} className="product-card n-rise n-hover-lift" style={{ '--d': `${catIdx * 70 + pIdx * 40}ms` }}>
                        <div className="product-img-wrap">
                          <img src={groupImage ? optimizedImageUrl(groupImage, 400) : '/logo.png'} className="product-img" alt={baseName} loading="lazy" />
                        </div>
                        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--ink)', unicodeBidi: 'plaintext' }}>{baseName}</h3>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {item.variants.map(v => (
                              <button
                                key={v.id}
                                onClick={() => setSelectedVariant(prev => ({ ...prev, [item.key]: v.id }))}
                                className="n-press"
                                style={{
                                  padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                                  border: `1.5px solid ${v.id === active.id ? style.accent : 'var(--line)'}`,
                                  background: v.id === active.id ? style.accent : 'var(--paper-raised)',
                                  color: v.id === active.id ? 'white' : 'var(--ink-soft)'
                                }}
                              >
                                {v.variantLabel || v.name.match(/\(([^)]+)\)$/)?.[1] || v.name}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span className="stub" style={{ color: style.deep, fontSize: '15px' }}>{active.price} ر.س</span>
                            <div className="qty-pill">
                              <button className="qty-btn n-press" style={{ background: style.accent }} onClick={() => handleAddToCart(active)}><Icons.Plus /></button>
                              <span style={{ width: '26px', textAlign: 'center', fontWeight: '900' }}>{qty}</span>
                              <button className="qty-btn" style={{ background: 'var(--paper-raised)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }} disabled={!qty} onClick={() => handleRemove(active)}><Icons.Minus /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div style={{ padding: '20px' }}>
          <h1 style={{ fontWeight: '900', color: 'var(--ink)', marginBottom: '24px', fontSize: '22px' }}>سجل طلباتي</h1>
          {!customerPhone ? (
            <div className="n-card" style={{ padding: '30px 20px', textAlign: 'center' }}>
              <div style={{ color: 'var(--teal)', marginBottom: '15px', display: 'flex', justifyContent: 'center' }}><Icons.Phone /></div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--ink)' }}>أدخل رقم جوالك</h3>
              <p style={{ color: 'var(--ink-faint)', fontSize: '14px', marginBottom: '18px' }}>لعرض طلباتك السابقة وتتبعها ومتابعة نقاطك</p>
              <input
                type="tel" placeholder="05xxxxxxxx" className="n-input"
                onChange={e => { setCustomerPhone(e.target.value); localStorage.setItem("nekterCustomerPhone", e.target.value); }}
                style={{ textAlign: 'center', direction: 'ltr' }}
              />
            </div>
          ) : myOrders.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--ink-faint)', marginTop: '50px' }}>لا يوجد طلبات سابقة مسجلة برقمك..</p>
          ) : (
            <>
              {rewards.length > 0 && (
                <div className="n-card n-rise" style={{ padding: '20px', marginBottom: '20px', background: 'linear-gradient(135deg, var(--teal-tint), var(--paper-raised))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, color: 'var(--teal-deep)', fontSize: '16px' }}>🎁 مكافآتك</h3>
                    <span className="stub" style={{ color: 'var(--teal-deep)' }}>{availablePoints} نقطة متاحة</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {rewards.map(r => {
                      const canRedeem = availablePoints >= r.pointsCost;
                      return (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-raised)', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', opacity: canRedeem ? 1 : 0.6 }}>
                          <div>
                            <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{r.name}</b>
                            <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', fontWeight: '700' }}>{r.pointsCost} نقطة</div>
                          </div>
                          <button className="n-btn n-press" disabled={!canRedeem} style={{ padding: '9px 18px', fontSize: '13px', background: canRedeem ? 'var(--teal)' : 'var(--paper)', color: canRedeem ? 'white' : 'var(--ink-faint)' }} onClick={() => redeemReward(r)}>
                            استبدال
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {myOrders.map(o => {
                const currentStep = getStepIndex(o.status);
              return (
                <div key={o.id} className="order-ticket n-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-faint)', fontSize: '13px' }}>#{o.id.slice(-6).toUpperCase()}</span>
                    <span className="stub" style={{ color: 'var(--teal-deep)' }}>{o.total} ر.س</span>
                  </div>

                  <div className="progress-rail">
                    <div className="progress-line-bg" />
                    <div className="progress-line-fg" style={{ width: `${(currentStep / (TRACKING_STEPS.length - 1)) * 100}%` }} />
                    <div className="progress-steps">
                      {TRACKING_STEPS.map((stepName, idx) => {
                        const isCompleted = idx <= currentStep;
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className={`progress-dot ${isCompleted ? 'done' : ''}`}>
                              {isCompleted && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--teal)' }} />}
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '10.5px', fontWeight: '800', color: isCompleted ? 'var(--teal-deep)' : 'var(--ink-faint)', textAlign: 'center', maxWidth: '60px' }}>{stepName}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <button className="n-btn n-btn-outline" style={{ padding: '12px' }} onClick={() => setSelectedOrderDetails(o)}>📄 تفاصيل الطلب</button>
                    <button className="n-btn" style={{ padding: '12px', background: 'var(--teal-tint)', color: 'var(--teal-deep)' }} onClick={() => handleOrderAgain(o.items)}>🔄 طلب مرة أخرى</button>
                  </div>

                  <a href="tel:+966562203030" className="n-btn n-btn-ghost" style={{ width: '100%', marginTop: '8px', padding: '10px', fontSize: '13px', textDecoration: 'none' }}>
                    <Icons.Call /> الاستفسار عن الطلب
                  </a>
                </div>
              );
            })}
            </>
          )}
        </div>
      )}

      {redeemedCode && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setRedeemedCode(null)}>
          <div className="n-card n-pop" style={{ width: '100%', maxWidth: '360px', padding: '30px', margin: '20px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '38px', marginBottom: '10px' }}>🎉</div>
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--ink)' }}>تم استبدال "{redeemedCode.name}"</h3>
            <p style={{ color: 'var(--ink-faint)', fontSize: '13px', margin: '0 0 18px' }}>قول الكود ده للكاشير عشان يفعّله</p>
            <div className="stub stub-lg" style={{ color: 'var(--teal-deep)', letterSpacing: '3px', margin: '0 auto 20px', display: 'inline-flex' }}>{redeemedCode.code}</div>
            <button className="n-btn n-btn-primary" style={{ width: '100%', padding: '14px' }} onClick={() => setRedeemedCode(null)}>تمام</button>
          </div>
        </div>
      )}

      {selectedOrderDetails && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setSelectedOrderDetails(null)}>
          <div className="n-card n-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '25px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ textAlign: 'center', margin: '0 0 18px 0', color: 'var(--ink)' }}>مكونات الطلب</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {selectedOrderDetails.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--ink-soft)', fontWeight: '600' }}>{item.name} <small style={{ color: 'var(--ink-faint)' }}>x{item.qty}</small></span>
                  <span style={{ fontWeight: '800', color: 'var(--teal-deep)' }}>{item.price * item.qty} ر.س</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '17px', color: 'var(--teal-deep)' }}>
              <span>الإجمالي:</span>
              <span>{selectedOrderDetails.total} ر.س</span>
            </div>
            <button className="n-btn n-btn-dark" style={{ width: '100%', marginTop: '20px', padding: '14px' }} onClick={() => setSelectedOrderDetails(null)}>إغلاق النافذة</button>
          </div>
        </div>
      )}

      <div className="bottom-nav">
        <div className={`nav-item ${view === "menu" ? "active" : ""}`} onClick={() => setView("menu")}><Icons.Menu /> المنيو</div>
        <div className={`nav-item ${view === "orders" ? "active" : ""}`} onClick={() => setView("orders")}><Icons.Orders /> طلباتي</div>
      </div>

      {cart.length > 0 && view === "menu" && (
        <div className={`n-card n-fade-in ${cartBounce ? 'n-pop' : ''}`} onAnimationEnd={() => setCartBounce(false)} style={{ position: 'fixed', bottom: '92px', left: '15px', right: '15px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-lg)', zIndex: 900 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--ink-faint)', fontWeight: '800' }}>{cartCount} صنف · الإجمالي</span>
            <span className="stub" style={{ color: 'var(--teal-deep)', fontSize: '18px', border: 'none', padding: 0 }}>{cartTotal} ر.س</span>
          </div>
          <button className="n-btn n-btn-primary" style={{ padding: '13px 28px', fontSize: '15px' }} onClick={() => setIsCheckoutOpen(true)}><Icons.Cart /> مراجعة الطلب</button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="sheet-overlay" onClick={() => setIsCheckoutOpen(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div style={{ width: '46px', height: '5px', background: 'var(--line)', borderRadius: '5px', margin: '0 auto 22px auto' }} />
            <h2 style={{ textAlign: 'center', fontWeight: '900', color: 'var(--teal-deep)', margin: '0 0 22px 0' }}>تأكيد الطلب</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="n-label"><Icons.User /> الاسم الكريم</label>
                <input type="text" placeholder="ليصلك الطلب باسمك.." className="n-input" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label className="n-label"><Icons.Phone /> رقم الجوال</label>
                <input type="tel" placeholder="05xxxxxxxx" className="n-input" style={{ direction: 'ltr' }} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
            </div>
            <label className="n-label">ملاحظات إضافية</label>
            <textarea placeholder="أي ملاحظات؟ (بدون سكر، زيادة ثلج..)" className="n-textarea" style={{ minHeight: '80px', marginBottom: '20px' }} value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />

            <div style={{ background: 'var(--paper)', borderRadius: 'var(--r-lg)', padding: '18px', marginBottom: '20px', border: '1px solid var(--line)' }}>
              {cart.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--ink-soft)' }}>{i.name} <small>x{i.qty}</small></span>
                  <span style={{ fontWeight: '700' }}>{i.price * i.qty} ر.س</span>
                </div>
              ))}
              <div style={{ height: '1px', background: 'var(--line)', margin: '14px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '900', fontSize: '17px' }}>الإجمالي النهائي:</span>
                <span className="stub stub-lg" style={{ color: 'var(--teal-deep)' }}>{cartTotal} ر.س</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <button className="n-btn" style={{ padding: '15px', border: paymentMethod === "شبكة" ? '2px solid var(--teal)' : '1.5px solid var(--line)', background: paymentMethod === "شبكة" ? 'var(--teal-tint)' : 'var(--paper-raised)', color: 'var(--ink)' }} onClick={() => setPaymentMethod("شبكة")}>💳 شبكة</button>
              <button className="n-btn" style={{ padding: '15px', border: paymentMethod === "كاش" ? '2px solid var(--teal)' : '1.5px solid var(--line)', background: paymentMethod === "كاش" ? 'var(--teal-tint)' : 'var(--paper-raised)', color: 'var(--ink)' }} onClick={() => setPaymentMethod("كاش")}>💵 كاش</button>
            </div>
            <button disabled className="n-btn" style={{ width: '100%', padding: '15px', background: 'var(--paper)', color: 'var(--ink-faint)', marginBottom: '20px', cursor: 'not-allowed' }}>📱 الدفع عبر التطبيق (قريباً)</button>
            <button className="n-btn n-btn-primary" style={{ width: '100%', padding: '17px', fontSize: '17px' }} onClick={submitOrder}>إرسال الطلب 🚀</button>
            <button className="n-btn n-btn-ghost" style={{ width: '100%', padding: '12px', marginTop: '8px' }} onClick={() => setIsCheckoutOpen(false)}>رجوع للمنيو</button>
          </div>
        </div>
      )}

      {showOrderSuccess && (
        <div className="sheet-overlay" style={{ alignItems: 'center', background: 'rgba(20,109,100,0.92)' }}>
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <ConfettiBurst count={18} />
            <div className="n-pop" style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px', margin: '0 auto 20px' }}>✅</div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: '0 0 6px' }}>تم إرسال طلبك!</h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: '14px' }}>هيوصلك على طاولتك في أسرع وقت 🚀</p>
          </div>
        </div>
      )}

      {showToast && <div className="n-toast">تم التحديث بنجاح ✔️</div>}
    </div>
  );
};

export default CustomerView;
