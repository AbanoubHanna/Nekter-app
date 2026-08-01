import React, { useState, useEffect, useRef } from "react";
import { supabase, mapOrderedRow, toSnakeRow } from "../supabase";
import { useLocation } from "react-router-dom";
import ConfettiBurst from "../components/ConfettiBurst";
import { Icons } from "../components/Icons";
import "../styles/theme.css";

// --- single brand accent (teal) for all categories, matching nekterdrinksbar.sa ---
const getTemp = () => "cold";
const TEMP_STYLE = {
  cold:  { tag: "tag-cold",  accent: "var(--teal)",  deep: "var(--teal-deep)" },
  hot:   { tag: "tag-cold",  accent: "var(--teal)",  deep: "var(--teal-deep)" },
  sweet: { tag: "tag-cold",  accent: "var(--teal)",  deep: "var(--teal-deep)" },
};

const GlobalStyle = () => (
  <style>{`
    body { margin: 0; background-color: var(--paper); direction: rtl; padding-bottom: 130px; color: var(--ink); }
    .hero-wrap { position: relative; border-radius: 0 0 32px 32px; overflow: hidden; box-shadow: var(--shadow-md); margin-bottom: 22px; }
    .hero-top { background: var(--ink); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
    .hero-body { background: var(--teal); padding: 34px 20px 42px; text-align: center; }
    .search-bar { margin: 0 20px 18px; position: relative; }
    .search-bar input { width: 100%; padding: 13px 44px 13px 16px; border-radius: var(--r-full); border: 1.5px solid var(--line); background: var(--paper-raised); font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--ink); outline: none; transition: 0.2s; }
    .search-bar input:focus { border-color: var(--teal); box-shadow: 0 0 0 4px var(--teal-tint); }
    .search-bar .search-icon { position: absolute; top: 50%; right: 16px; transform: translateY(-50%); color: var(--ink-faint); pointer-events: none; }
    .search-bar .clear-btn { position: absolute; top: 50%; left: 14px; transform: translateY(-50%); color: var(--ink-faint); cursor: pointer; background: none; border: none; display: flex; }
    .cat-rail { display: flex; gap: 10px; overflow-x: auto; padding: 0 20px 18px; scrollbar-width: none; }
    .cat-rail::-webkit-scrollbar { display: none; }
    .cat-chip { flex-shrink: 0; padding: 10px 20px; border-radius: var(--r-full); font-weight: 800; font-size: 14px; white-space: nowrap; cursor: pointer; border: 1.5px solid var(--line); background: var(--paper-raised); color: var(--ink-soft); transition: 0.2s; }
    .cat-chip.active { background: var(--teal); color: white; border-color: var(--teal); }
    .section-head { padding: 4px 20px; display: flex; flex-direction: column; gap: 10px; margin: 22px 0 12px; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding: 0 20px; }
    .product-rail { display: flex; gap: 14px; overflow-x: auto; padding: 4px 20px 18px; scrollbar-width: none; }
    .product-rail::-webkit-scrollbar { display: none; }
    .product-card { background: var(--paper-raised); border-radius: var(--r-lg); border: 1px solid var(--line); overflow: hidden; display: flex; flex-direction: row; align-items: stretch; gap: 12px; padding: 14px; box-shadow: var(--shadow-sm); transition: 0.2s; }
    .product-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .product-img-wrap { position: relative; width: 84px; height: 84px; flex-shrink: 0; border-radius: var(--r-md); overflow: hidden; background: var(--paper); }
    .product-img { width: 100%; height: 100%; object-fit: cover; }
    .qty-pill { display: flex; align-items: center; background: var(--paper); border-radius: var(--r-full); border: 1.5px solid var(--line); }
    .qty-btn { width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; }
    .img-overlay { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; z-index: 2; }
    .img-overlay-btn { width: 22px; height: 22px; flex-shrink: 0; border-radius: 50%; border: none; background: rgba(255,255,255,0.9); box-shadow: var(--shadow-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--ink-soft); transition: 0.15s; }
    .img-overlay-btn:hover { transform: scale(1.08); }
    .img-overlay-btn.is-favorite { color: var(--danger); }
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

const ProductCard = ({ product, qty, accent, deep, isFavorite, onToggleFavorite, onShare, onAdd, onRemove, badge, extraLine, cardStyle, delay, className = "", anchored = false }) => (
  <div id={anchored ? `product-${product.id}` : undefined} className={`product-card n-rise n-hover-lift ${className}`} style={{ '--d': `${delay}ms`, position: 'relative', ...cardStyle }}>
    {badge}
    <div className="product-img-wrap">
      <img src={product.image || '/logo.png'} className="product-img" alt={product.name} loading="lazy" />
      <div className="img-overlay">
        <button type="button" className={`img-overlay-btn ${isFavorite ? 'is-favorite' : ''}`} onClick={() => onToggleFavorite(product)} aria-label="إضافة للمفضلة">
          <Icons.Heart size={13} filled={isFavorite} />
        </button>
        <button type="button" className="img-overlay-btn" onClick={() => onShare(product)} aria-label="مشاركة المنتج">
          <Icons.Share size={12} />
        </button>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--ink)' }}>{product.name}</h3>
      {extraLine}
      <span style={{ fontSize: '12px', color: 'var(--ink-faint)', fontWeight: '700' }}>الإجمالي: {product.price * qty} ر.س</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'space-between' }}>
      <span className="stub" style={{ color: deep, fontSize: '17px' }}>{product.price} ر.س</span>
      <div className="qty-pill">
        <button className="qty-btn n-press" style={{ background: accent }} onClick={() => onAdd(product)}><Icons.Plus /></button>
        <span style={{ width: '26px', textAlign: 'center', fontWeight: '900' }}>{qty}</span>
        <button className="qty-btn" style={{ background: 'var(--paper-raised)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }} disabled={!qty} onClick={() => onRemove(product)}><Icons.Minus /></button>
      </div>
    </div>
  </div>
);

const CustomerView = () => {
  const [view, setView] = useState("menu");
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartBounce, setCartBounce] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nekterFavorites") || "[]"); } catch { return []; }
  });

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
  const prevOrderStepsRef = useRef(null);

  const { search } = useLocation();
  const tableNumber = new URLSearchParams(search).get("table") || "1";
  const sharedProductId = new URLSearchParams(search).get("product");
  const TRACKING_STEPS = ["تم الاستلام", "تم الدفع", "يتم التحضير", "جاهز للاستلام"];

  useEffect(() => {
    if (!sharedProductId || products.length === 0) return;
    const target = products.find(p => p.id === sharedProductId);
    if (!target) return;
    setActiveCategory(target.isCombo ? "الكل" : target.category);
    const timer = setTimeout(() => {
      document.getElementById(`product-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
    return () => clearTimeout(timer);
  }, [sharedProductId, products]);

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
        const myCurrentOrders = allOrders.filter(o => o.customerPhone === customerPhone);
        const totalSpent = myCurrentOrders.filter(o => o.status !== "ملغي").reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        setUserPoints(Math.floor(totalSpent / 10));

        const prevSteps = prevOrderStepsRef.current;
        const nextSteps = {};
        myCurrentOrders.forEach(o => { nextSteps[o.id] = getStepIndex(o.status); });
        if (prevSteps) {
          myCurrentOrders.forEach(o => {
            const wasReady = prevSteps[o.id] === 3;
            const isReady = nextSteps[o.id] === 3;
            if (isReady && !wasReady) {
              try {
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("طلبك جاهز! 🎉", { body: `طلبك من نكتير جاهز للاستلام على طاولتك.` });
                }
                new Audio('/notification.mp3').play().catch(() => {});
              } catch { /* notification unavailable */ }
              showToastMsg("طلبك جاهز للاستلام!", Icons.CheckCircle);
            }
          });
        }
        prevOrderStepsRef.current = nextSteps;

        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
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

  const resetCustomerSession = () => {
    if (!window.confirm("هيتم مسح رقمك واسمك وسلة الطلب الحالية من الجهاز ده، عشان الشخص اللي بعدك يدخل بياناته هو. تكمل؟")) return;
    localStorage.removeItem("nekterCustomerName");
    localStorage.removeItem("nekterCustomerPhone");
    setCustomerName("");
    setCustomerPhone("");
    setCart([]);
  };

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

  const showToastMsg = (text, Icon = Icons.Check) => {
    setToastMsg({ text, Icon });
    setTimeout(() => setToastMsg(null), 1800);
  };

  const handleAddToCart = (p) => {
    const ex = cart.find(x => x.id === p.id);
    setCart(ex ? cart.map(x => x.id === p.id ? { ...ex, qty: ex.qty + 1 } : x) : [...cart, { ...p, qty: 1 }]);
    showToastMsg("تم التحديث بنجاح");
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
    showToastMsg("تم التحديث بنجاح");
  };

  const toggleFavorite = (p) => {
    setFavorites(prev => {
      const next = prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id];
      localStorage.setItem("nekterFavorites", JSON.stringify(next));
      return next;
    });
  };

  const shareProduct = async (p) => {
    const productUrl = `${window.location.origin}/?product=${p.id}`;
    const text = `${p.name} - ${p.price} ر.س`;
    if (navigator.share) {
      try { await navigator.share({ title: p.name, text, url: productUrl }); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(productUrl);
        showToastMsg("تم نسخ رابط المنتج للمشاركة", Icons.Clipboard);
      } catch { /* clipboard unavailable */ }
    }
  };

  const MOST_ORDERED_LABEL = "الأكثر طلبًا";

  const productOrderCounts = ordersHistory.reduce((acc, o) => {
    (o.items || []).forEach(item => { acc[item.id] = (acc[item.id] || 0) + (Number(item.qty) || 0); });
    return acc;
  }, {});
  const mostOrdered = products
    .filter(p => !p.isCombo && productOrderCounts[p.id] > 0)
    .sort((a, b) => (productOrderCounts[b.id] || 0) - (productOrderCounts[a.id] || 0))
    .slice(0, 8);

  const dbCatNames = dbCategories.map(c => c.name);
  const dynamicCats = [...new Set(products.map(p => p.category).filter(Boolean))];
  const missingCats = dynamicCats.filter(c => !dbCatNames.includes(c));
  const categories = ["الكل", ...(mostOrdered.length > 0 ? [MOST_ORDERED_LABEL] : []), ...dbCatNames, ...missingCats];

  const filtered = (activeCategory === "الكل" ? products : products.filter(p => p.category === activeCategory)).filter(p => !p.isCombo);
  const grouped = filtered.reduce((acc, p) => { (acc[p.category] = acc[p.category] || []).push(p); return acc; }, {});

  const isSearching = searchQuery.trim().length > 0;
  const searchResults = isSearching
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : [];

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
              <span className="stub" style={{ color: 'white', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--r-full)', padding: '8px 16px' }}><Icons.Pin /> طاولة {tableNumber}</span>
              <span className="stub" style={{ color: 'white', background: 'var(--amber)', borderRadius: 'var(--r-full)', padding: '8px 16px' }}><Icons.Star /> {availablePoints} نقطة</span>
            </div>
            <div className="hero-body">
              <img src="/logo.png" alt="Nekter" style={{ height: '80px', objectFit: 'contain', marginBottom: '16px' }} />
              <p style={{ color: 'white', fontSize: '17px', fontWeight: '700', margin: 0, opacity: 0.95 }}>اطلب من مكانك.. ويوصلك لحد طاولتك</p>
            </div>
          </div>

          <div className="search-bar">
            <input
              type="text" placeholder="دور على مشروب..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button type="button" className="clear-btn" onClick={() => setSearchQuery("")} aria-label="مسح البحث"><Icons.Close /></button>
            ) : (
              <span className="search-icon"><Icons.Search /></span>
            )}
          </div>

          {isSearching ? (
            <div className="n-fade-in">
              <div className="section-head">
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--ink)', margin: 0 }}>نتائج البحث عن "{searchQuery}"</h2>
              </div>
              {searchResults.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--ink-faint)', marginTop: '30px' }}>مفيش منتجات متطابقة مع بحثك</p>
              ) : (
                <div className="products-grid">
                  {searchResults.map((p, pIdx) => {
                    const qty = cart.find(x => x.id === p.id)?.qty || 0;
                    return (
                      <ProductCard key={p.id} product={p} qty={qty} accent="var(--teal)" deep="var(--teal-deep)"
                        isFavorite={favorites.includes(p.id)} onToggleFavorite={toggleFavorite} onShare={shareProduct}
                        onAdd={handleAddToCart} onRemove={handleRemove} delay={pIdx * 40}
                        extraLine={<p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-faint)', lineHeight: '1.5' }}>{p.description}</p>} />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="cat-rail">
                {categories.map(c => (
                  <div key={c} className={`cat-chip ${activeCategory === c ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>{c}</div>
                ))}
              </div>

              {activeCategory === MOST_ORDERED_LABEL ? (
                <div className="n-fade-in">
                  <div className="section-head">
                    <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--teal-deep)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icons.Fire /> {MOST_ORDERED_LABEL}
                    </h2>
                  </div>
                  <div className="products-grid">
                    {mostOrdered.map((p, idx) => {
                      const qty = cart.find(x => x.id === p.id)?.qty || 0;
                      return (
                        <ProductCard key={p.id} product={p} qty={qty} accent="var(--teal)" deep="var(--teal-deep)"
                          isFavorite={favorites.includes(p.id)} onToggleFavorite={toggleFavorite} onShare={shareProduct}
                          onAdd={handleAddToCart} onRemove={handleRemove} delay={idx * 40} anchored
                          extraLine={<p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-faint)', lineHeight: '1.5' }}>{p.description}</p>} />
                      );
                    })}
                  </div>
                </div>
              ) : (
              <>
              {!loading && activeCategory === "الكل" && mostOrdered.length > 0 && (
                <div className="n-rise" style={{ '--d': '10ms' }}>
                  <div className="section-head">
                    <h2 style={{ fontSize: '21px', fontWeight: '900', color: 'var(--teal-deep)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icons.Fire /> الأكثر طلبًا
                    </h2>
                  </div>
                  <div className="product-rail">
                    {mostOrdered.map((p, idx) => {
                      const qty = cart.find(x => x.id === p.id)?.qty || 0;
                      return (
                        <ProductCard key={p.id} product={p} qty={qty} accent="var(--teal)" deep="var(--teal-deep)"
                          isFavorite={favorites.includes(p.id)} onToggleFavorite={toggleFavorite} onShare={shareProduct}
                          onAdd={handleAddToCart} onRemove={handleRemove} delay={idx * 50}
                          cardStyle={{ minWidth: '280px', maxWidth: '280px', flexShrink: 0 }}
                          extraLine={<p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-faint)', lineHeight: '1.5' }}>{p.description}</p>} />
                      );
                    })}
                  </div>
                </div>
              )}

              {!loading && activeCategory === "الكل" && products.some(p => p.isCombo) && (
                <div className="n-rise" style={{ '--d': '20ms' }}>
                  <div className="section-head">
                    <h2 style={{ fontSize: '21px', fontWeight: '900', color: 'var(--berry-deep)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icons.Gift size={20} /> كومبو اللمة
                    </h2>
                  </div>
                  <div className="product-rail">
                    {products.filter(p => p.isCombo).map((p, idx) => {
                      const qty = cart.find(x => x.id === p.id)?.qty || 0;
                      return (
                        <ProductCard key={p.id} product={p} qty={qty} accent="var(--berry)" deep="var(--berry-deep)"
                          isFavorite={favorites.includes(p.id)} onToggleFavorite={toggleFavorite} onShare={shareProduct}
                          onAdd={handleAddToCart} onRemove={handleRemove} delay={idx * 50} anchored
                          className="combo-card" cardStyle={{ minWidth: '280px', maxWidth: '280px', flexShrink: 0 }}
                          badge={<span className="combo-ribbon">عرض خاص</span>}
                          extraLine={p.comboItems?.length > 0 && (
                            <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--berry-deep)', fontWeight: '700', lineHeight: '1.5' }}>
                              {p.comboItems.map(i => `${i.qty}x ${i.name}`).join(' + ')}
                            </p>
                          )} />
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
                      <span className="tag tag-neutral">{grouped[cat].length} منتجات</span>
                      <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--ink)', margin: 0 }}>{cat}</h2>
                    </div>
                    <div className="products-grid">
                      {grouped[cat].map((p, pIdx) => {
                        const qty = cart.find(x => x.id === p.id)?.qty || 0;
                        return (
                          <ProductCard key={p.id} product={p} qty={qty} accent={style.accent} deep={style.deep}
                            isFavorite={favorites.includes(p.id)} onToggleFavorite={toggleFavorite} onShare={shareProduct}
                            onAdd={handleAddToCart} onRemove={handleRemove} delay={catIdx * 70 + pIdx * 40} anchored
                            extraLine={<p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-faint)', lineHeight: '1.5' }}>{p.description}</p>} />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </>
              )}
            </>
          )}
        </>
      ) : (
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <h1 style={{ fontWeight: '900', color: 'var(--ink)', fontSize: '22px', margin: 0 }}>سجل طلباتي</h1>
            {customerPhone && (
              <button className="n-btn n-btn-ghost" style={{ fontSize: '12px', padding: '6px 10px' }} onClick={resetCustomerSession}>مش انت؟ غيّر الحساب</button>
            )}
          </div>
          {customerPhone && (
            <p style={{ color: 'var(--ink-faint)', fontSize: '12.5px', marginTop: 0, marginBottom: '20px', direction: 'ltr', textAlign: 'right' }}>{customerPhone}</p>
          )}
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
                <div className="n-card n-rise" style={{ padding: '20px', marginBottom: '20px', background: 'linear-gradient(135deg, var(--amber-tint), var(--paper-raised))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, color: 'var(--amber-deep)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.Gift size={17} /> مكافآتك</h3>
                    <span className="stub" style={{ color: 'var(--amber-deep)' }}>{availablePoints} نقطة متاحة</span>
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
                          <button className="n-btn n-press" disabled={!canRedeem} style={{ padding: '9px 18px', fontSize: '13px', background: canRedeem ? 'var(--amber)' : 'var(--paper)', color: canRedeem ? 'white' : 'var(--ink-faint)' }} onClick={() => redeemReward(r)}>
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

                  {o.status === "ملغي" ? (
                    <div style={{ background: 'var(--danger-tint)', color: 'var(--danger)', borderRadius: 'var(--r-md)', padding: '14px', textAlign: 'center', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Icons.AlertTriangle size={16} /> تم إلغاء هذا الطلب
                    </div>
                  ) : (
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
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <button className="n-btn n-btn-outline" style={{ padding: '12px' }} onClick={() => setSelectedOrderDetails(o)}><Icons.Receipt size={16} /> تفاصيل الطلب</button>
                    <button className="n-btn" style={{ padding: '12px', background: 'var(--teal-tint)', color: 'var(--teal-deep)' }} onClick={() => handleOrderAgain(o.items)}><Icons.Repeat /> طلب مرة أخرى</button>
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
            <div style={{ color: 'var(--berry-deep)', marginBottom: '10px', display: 'flex', justifyContent: 'center' }}><Icons.Gift size={38} /></div>
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--ink)' }}>تم استبدال "{redeemedCode.name}"</h3>
            <p style={{ color: 'var(--ink-faint)', fontSize: '13px', margin: '0 0 18px' }}>قول الكود ده للكاشير عشان يفعّله</p>
            <div className="stub stub-lg" style={{ color: 'var(--amber-deep)', letterSpacing: '3px', margin: '0 auto 20px', display: 'inline-flex' }}>{redeemedCode.code}</div>
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
        <div className={`nav-item ${view === "menu" ? "active" : ""}`} onClick={() => setView("menu")}><Icons.Menu size={22} /> المنيو</div>
        <div className={`nav-item ${view === "orders" ? "active" : ""}`} onClick={() => setView("orders")}><Icons.Orders size={22} /> طلباتي</div>
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
            {(customerName || customerPhone) && (
              <button type="button" className="n-btn n-btn-ghost" style={{ padding: '4px 0', fontSize: '11.5px', marginBottom: '16px' }} onClick={resetCustomerSession}>مش دي بياناتك؟ امسحها وابدأ من جديد</button>
            )}
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
              <button className="n-btn" style={{ padding: '15px', border: paymentMethod === "شبكة" ? '2px solid var(--teal)' : '1.5px solid var(--line)', background: paymentMethod === "شبكة" ? 'var(--teal-tint)' : 'var(--paper-raised)', color: 'var(--ink)' }} onClick={() => setPaymentMethod("شبكة")}><Icons.CreditCard size={16} /> شبكة</button>
              <button className="n-btn" style={{ padding: '15px', border: paymentMethod === "كاش" ? '2px solid var(--teal)' : '1.5px solid var(--line)', background: paymentMethod === "كاش" ? 'var(--teal-tint)' : 'var(--paper-raised)', color: 'var(--ink)' }} onClick={() => setPaymentMethod("كاش")}><Icons.Cash size={16} /> كاش</button>
            </div>
            <button disabled className="n-btn" style={{ width: '100%', padding: '15px', background: 'var(--paper)', color: 'var(--ink-faint)', marginBottom: '20px', cursor: 'not-allowed' }}><Icons.Smartphone size={16} /> الدفع عبر التطبيق (قريباً)</button>
            <button className="n-btn n-btn-primary" style={{ width: '100%', padding: '17px', fontSize: '17px' }} onClick={submitOrder}><Icons.Rocket size={18} /> إرسال الطلب</button>
            <button className="n-btn n-btn-ghost" style={{ width: '100%', padding: '12px', marginTop: '8px' }} onClick={() => setIsCheckoutOpen(false)}>رجوع للمنيو</button>
          </div>
        </div>
      )}

      {showOrderSuccess && (
        <div className="sheet-overlay" style={{ alignItems: 'center', background: 'rgba(20,109,100,0.92)' }}>
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <ConfettiBurst count={18} />
            <div className="n-pop" style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'white', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Icons.CheckCircle size={44} /></div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: '0 0 6px' }}>تم إرسال طلبك!</h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Icons.Rocket size={14} /> هيوصلك على طاولتك في أسرع وقت</p>
          </div>
        </div>
      )}

      {toastMsg && <div className="n-toast"><toastMsg.Icon size={16} /> {toastMsg.text}</div>}
    </div>
  );
};

export default CustomerView;
