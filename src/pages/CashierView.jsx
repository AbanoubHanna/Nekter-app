import React, { useState, useEffect } from "react";
import { supabase, mapOrderedRow } from "../supabase";
import { Icons } from "../components/Icons";
import "../styles/theme.css";

const GlobalStyle = () => (
  <style>{`
    body { margin: 0; background-color: var(--paper); direction: rtl; color: var(--ink); overflow: hidden; }
    .pos-layout { display: flex; height: 100vh; flex-direction: column; }

    .top-bar { height: 76px; background: var(--ink); display: flex; align-items: center; justify-content: space-between; padding: 0 25px; color: white; box-shadow: var(--shadow-md); z-index: 10; flex-shrink: 0; }
    .tabs-container { display: flex; background: rgba(255,255,255,0.06); border-radius: 14px; padding: 6px; gap: 5px; overflow-x: auto; }
    .tab-btn { padding: 10px 18px; border-radius: 10px; font-weight: 800; font-size: 14px; cursor: pointer; color: #9BA6B8; display: flex; align-items: center; gap: 8px; transition: 0.25s; border: 1px solid transparent; white-space: nowrap; }
    .tab-btn.active { background: white; color: var(--ink); box-shadow: var(--shadow-sm); }
    .badge { color: white; font-size: 11px; padding: 2px 8px; border-radius: var(--r-full); font-weight: 900; margin-right: 5px; }

    .content-area { flex: 1; display: flex; overflow: hidden; background: var(--paper); }
    .orders-grid { padding: 26px; display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 18px; overflow-y: auto; height: 100%; align-content: start; width: 100%; }

    .order-card { background: var(--paper-raised); border-radius: var(--r-lg); padding: 20px; border: 1px solid var(--line); border-top-width: 5px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 14px; position: relative; transition: 0.2s; }
    .order-card:hover { box-shadow: var(--shadow-md); }
    .status-tag { padding: 5px 12px; border-radius: var(--r-sm); font-size: 12px; font-weight: 900; }
    .action-btn { width: 100%; border: none; padding: 13px; border-radius: var(--r-md); font-weight: 900; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; color: white; }
    .action-btn:active { transform: scale(0.98); }

    .sound-btn { background: rgba(255,255,255,0.08); border: none; color: white; padding: 10px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
    .sound-btn:hover { background: rgba(255,255,255,0.16); }
    .sound-btn.muted { color: var(--danger); background: rgba(214,69,69,0.18); }

    .dropdown-menu { position: absolute; top: 60px; left: 0; background: var(--paper-raised); border-radius: var(--r-md); box-shadow: var(--shadow-lg); width: 220px; overflow: hidden; color: var(--ink); z-index: 100; border: 1px solid var(--line); }
    .dropdown-item { padding: 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: bold; font-size: 14px; border-bottom: 1px solid var(--paper); transition: 0.2s; }
    .dropdown-item:hover { background: var(--paper); color: var(--teal); }
    .dropdown-item.danger { color: var(--danger); border-bottom: none; }
    .dropdown-item.danger:hover { background: var(--danger-tint); }

    .login-overlay { position: fixed; inset: 0; background: var(--ink); display: flex; align-items: center; justify-content: center; z-index: 9999; }
    .login-box { background: var(--paper-raised); padding: 40px; border-radius: 28px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); text-align: center; }
  `}</style>
);

const CashierView = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginTab, setLoginTab] = useState("كاشير");
  const [loginData, setLoginData] = useState({ pin: "", email: "", password: "" });

  const [viewMode, setViewMode] = useState("تم الاستلام");
  const [orders, setOrders] = useState([]);
  const [prevCount, setPrevCount] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemResult, setRedeemResult] = useState(null); // { ok, message }
  const [profileForm, setProfileForm] = useState({ name: "", photo: "", pin: "" });

  const handleRedeemCode = async (e) => {
    e.preventDefault();
    setRedeemResult(null);
    const code = redeemCode.trim().toUpperCase();
    const { data, error } = await supabase.from('loyalty_redemptions').select('*').eq('code', code).maybeSingle();
    if (error || !data) { setRedeemResult({ ok: false, message: "الكود غير موجود" }); return; }
    if (data.status === 'مستخدم') { setRedeemResult({ ok: false, message: "الكود ده اتفعّل قبل كده" }); return; }
    await supabase.from('loyalty_redemptions').update({ status: 'مستخدم', used_at: new Date().toISOString() }).eq('id', data.id);
    setRedeemResult({ ok: true, message: `تم تفعيل: ${data.reward_name}` });
    setRedeemCode("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = loginTab === "كاشير"
        ? await supabase.rpc('rpc_login_cashier', { p_pin: loginData.pin })
        : await supabase.rpc('rpc_login_manager', { p_email: loginData.email, p_password: loginData.password });

      if (error) throw error;

      if (data && data.length > 0) {
        const userData = data[0];
        if (userData.status === "موقوف") {
          alert("حسابك موقوف، يرجى مراجعة الإدارة.");
          return;
        }
        setCurrentUser(userData);
        setProfileForm({ name: userData.name, photo: userData.photo || "", pin: loginTab === "كاشير" ? loginData.pin : "" });
        setLoginData({ pin: "", email: "", password: "" });
      } else {
        alert("بيانات الدخول غير صحيحة!");
      }
    } catch (error) {
      alert("حدث خطأ في الاتصال بقاعدة البيانات.");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.rpc('rpc_update_staff', {
        p_id: currentUser.id,
        p_name: profileForm.name,
        p_role: currentUser.role,
        p_pin: profileForm.pin,
        p_photo: profileForm.photo,
      });
      if (error) throw error;
      setCurrentUser({ ...currentUser, ...profileForm });
      setShowEditProfile(false);
      alert("تم تحديث بياناتك بنجاح");
    } catch (error) {
      alert("فشل في تحديث البيانات.");
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) return;
      const fetchedOrders = data.map(mapOrderedRow);
      setOrders(fetchedOrders);

      const newOrdersCount = fetchedOrders.filter(o => o.status === "تم الاستلام" || o.status === "جديد" || !o.status).length;
      if (newOrdersCount > prevCount && isSoundEnabled) {
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log("المتصفح يمنع التشغيل التلقائي للصوت", e));
        } catch (e) { console.log("خطأ في تشغيل الصوت"); }
      }
      setPrevCount(newOrdersCount);
    };

    fetchOrders();
    const channel = supabase.channel('cashier-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [prevCount, isSoundEnabled, currentUser]);

  const stage1 = orders.filter(o => o.status === "تم الاستلام" || o.status === "جديد" || !o.status);
  const stage2 = orders.filter(o => o.status === "تم الدفع");
  const stage3 = orders.filter(o => o.status === "جاري التجهيز" || o.status === "التحضير");
  const stage4 = orders.filter(o => o.status === "جاهز للاستلام");

  const stagesConfig = {
    "تم الاستلام": { data: stage1, color: "var(--danger)", tint: "var(--danger-tint)", btnText: "تأكيد الدفع", nextState: "تم الدفع", icon: <Icons.Bell /> },
    "تم الدفع": { data: stage2, color: "var(--info)", tint: "var(--info-tint)", btnText: "بدء التجهيز", nextState: "جاري التجهيز", icon: <Icons.Wallet /> },
    "جاري التجهيز": { data: stage3, color: "var(--amber)", tint: "var(--amber-tint)", btnText: "الطلب جاهز للاستلام", nextState: "جاهز للاستلام", icon: <Icons.Coffee /> },
    "جاهز للاستلام": { data: stage4, color: "var(--success)", tint: "var(--success-tint)", btnText: "تسليم للعميل (إنهاء)", nextState: "مكتمل", icon: <Icons.Check /> }
  };

  const advanceOrderState = async (orderId, currentStage) => {
    const nextStatus = stagesConfig[currentStage].nextState;
    try {
      const { error } = await supabase.from('orders').update({ status: nextStatus, last_updated: new Date().toISOString() }).eq('id', orderId);
      if (error) throw error;
    } catch (error) {
      alert("حدث خطأ أثناء تحديث حالة الطلب!");
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm("متأكد إنك عايز تلغي/تسترجع الطلب ده؟ الإجراء ده مش هيتحسب في المبيعات ونقاط العميل، ومينفعش يترجع.")) return;
    try {
      const { error } = await supabase.from('orders').update({ status: "ملغي", last_updated: new Date().toISOString() }).eq('id', orderId);
      if (error) throw error;
    } catch (error) {
      alert("حدث خطأ أثناء إلغاء الطلب!");
    }
  };

  const renderOrdersGrid = () => {
    const currentConfig = stagesConfig[viewMode];
    const displayOrders = currentConfig.data;

    if (displayOrders.length === 0) {
      return (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '15vh', color: 'var(--ink-faint)' }}>
          <div style={{ fontSize: '60px', marginBottom: '15px', opacity: 0.3 }}>{currentConfig.icon}</div>
          <h2>لا توجد طلبات في هذه المرحلة</h2>
        </div>
      );
    }

    return displayOrders.map((order, idx) => (
      <div key={order.id} className="order-card n-fade-in n-rise n-hover-lift" style={{ borderTopColor: currentConfig.color, '--d': `${idx * 45}ms` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--ink)' }}>طاولة {order.tableNumber || "غير محدد"}</div>
            <div style={{ marginTop: '5px' }}>
              <div style={{ fontSize: '13px', color: 'var(--ink-soft)', fontWeight: '900' }}>{order.customerName || "ضيف"}</div>
              {order.customerPhone && (
                <div style={{ fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 'bold', marginTop: '2px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icons.Call size={11} /> {order.customerPhone}
                </div>
              )}
            </div>
          </div>
          <div className="status-tag" style={{ background: currentConfig.tint, color: currentConfig.color }}>
            {viewMode}
          </div>
        </div>

        <div style={{ background: 'var(--paper)', padding: '15px', borderRadius: 'var(--r-md)', flex: 1, border: '1px solid var(--line)' }}>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '15px', fontWeight: '800', color: 'var(--ink-soft)' }}>
              <span>{item.qty}x {item.name}</span>
            </div>
          ))}
          {order.notes && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--line)', color: 'var(--danger)', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icons.Note size={13} /> ملاحظة: {order.notes}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
          <span className="stub" style={{ color: 'var(--ink)', fontSize: '18px' }}>{order.total || order.subtotal || 0} ر.س</span>
        </div>

        <button className="action-btn n-press" style={{ background: currentConfig.color }} onClick={() => advanceOrderState(order.id, viewMode)}>
          {currentConfig.btnText}
        </button>
        <button className="n-btn n-btn-ghost" style={{ width: '100%', padding: '8px', fontSize: '12.5px', color: 'var(--danger)' }} onClick={() => cancelOrder(order.id)}>
          <Icons.Close size={13} /> إلغاء / استرجاع الطلب
        </button>
      </div>
    ));
  };

  if (!currentUser) {
    return (
      <div className="login-overlay">
        <GlobalStyle />
        <div className="login-box n-rise">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
            <img src="/logo.png" alt="Nekter" style={{ height: '52px', objectFit: 'contain', filter: 'brightness(0)' }} />
          </div>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--ink)' }}>تسجيل الدخول للنظام</h2>

          <div style={{ display: 'flex', background: 'var(--paper)', borderRadius: '14px', padding: '5px', marginBottom: '24px' }}>
            <button className={`tab-btn ${loginTab === 'كاشير' ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center', color: loginTab === 'كاشير' ? 'var(--ink)' : 'var(--ink-faint)' }} onClick={() => setLoginTab('كاشير')}>كاشير</button>
            <button className={`tab-btn ${loginTab === 'مدير' ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center', color: loginTab === 'مدير' ? 'var(--ink)' : 'var(--ink-faint)' }} onClick={() => setLoginTab('مدير')}>إدارة</button>
          </div>

          <form onSubmit={handleLogin}>
            {loginTab === "كاشير" ? (
              <input type="password" required maxLength="4" placeholder="أدخل رمز الـ PIN (4 أرقام)" className="n-input" style={{ textAlign: 'center', letterSpacing: '4px', marginBottom: '18px' }}
                value={loginData.pin} onChange={e => setLoginData({ ...loginData, pin: e.target.value })} />
            ) : (
              <>
                <input type="email" required placeholder="البريد الإلكتروني" className="n-input" style={{ textAlign: 'left', direction: 'ltr', marginBottom: '14px' }}
                  value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} />
                <input type="password" required placeholder="كلمة المرور" className="n-input" style={{ textAlign: 'left', direction: 'ltr', marginBottom: '18px' }}
                  value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
              </>
            )}
            <button type="submit" className="n-btn n-btn-primary" style={{ width: '100%', padding: '15px', fontSize: '16px' }}>دخول للنظام</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-layout">
      <GlobalStyle />

      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo.png" alt="Nekter" style={{ height: '32px', filter: 'brightness(0) invert(1)' }} />
          <div className="tabs-container">
            {Object.keys(stagesConfig).map(stage => (
              <div key={stage} className={`tab-btn ${viewMode === stage ? 'active' : ''}`} onClick={() => setViewMode(stage)}>
                {stagesConfig[stage].icon} {stage}
                <span className={`badge ${stage === "تم الاستلام" && stagesConfig[stage].data.length > 0 ? 'n-glow-pulse' : ''}`} style={{ background: stagesConfig[stage].color }}>
                  {stagesConfig[stage].data.length}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="n-btn" style={{ background: 'var(--amber)', color: 'white', padding: '10px 16px', fontSize: '13px' }} onClick={() => { setShowRedeem(true); setRedeemResult(null); }}>
            <Icons.Gift size={15} /> استبدال نقاط
          </button>
          <button
            className={`sound-btn ${!isSoundEnabled ? 'muted' : ''}`}
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            title={isSoundEnabled ? 'كتم الإشعارات' : 'تفعيل الإشعارات'}
          >
            {isSoundEnabled ? <Icons.VolumeUp /> : <Icons.VolumeMute />}
          </button>

          <div style={{ position: 'relative' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '14px', paddingLeft: '10px', borderLeft: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {currentUser.photo ? (
                <img src={currentUser.photo} style={{ width: 35, height: 35, borderRadius: '50%', objectFit: 'cover' }} alt="profile" />
              ) : (
                <div style={{ width: 35, height: 35, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icons.User />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                <span style={{ color: 'white' }}>{currentUser.name}</span>
                <span style={{ color: '#9BA6B8', fontSize: '11px' }}>{currentUser.role}</span>
              </div>
            </div>

            {showUserMenu && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => { setShowEditProfile(true); setShowUserMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icons.Edit size={14} /> تعديل بياناتي
                </div>
                <div className="dropdown-item danger" onClick={() => { setShowLogoutConfirm(true); setShowUserMenu(false); }}>
                  <Icons.Logout /> تقفيل شيفت وخروج
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="content-area">
        <div className="orders-grid">
          {renderOrdersGrid()}
        </div>
      </div>

      {showEditProfile && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setShowEditProfile(false)}>
          <div className="n-card n-fade-in" style={{ padding: '32px', width: '100%', maxWidth: '420px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px 0', color: 'var(--ink)' }}>تعديل بيانات الحساب</h2>
            <form onSubmit={handleUpdateProfile}>
              <label className="n-label">اسم الموظف</label>
              <input required className="n-input" style={{ marginBottom: '15px' }}
                value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />

              {currentUser.role === 'كاشير' && (
                <>
                  <label className="n-label">تغيير رمز الـ PIN</label>
                  <input required maxLength="4" className="n-input" style={{ marginBottom: '15px', letterSpacing: '3px' }}
                    value={profileForm.pin} onChange={e => setProfileForm({ ...profileForm, pin: e.target.value })} />
                </>
              )}

              <label className="n-label">رابط الصورة الشخصية (اختياري)</label>
              <input placeholder="https://..." className="n-input" style={{ marginBottom: '22px', direction: 'ltr', textAlign: 'left' }}
                value={profileForm.photo} onChange={e => setProfileForm({ ...profileForm, photo: e.target.value })} />

              <button type="submit" className="n-btn n-btn-primary" style={{ width: '100%', padding: '15px' }}><Icons.Check size={16} /> حفظ التعديلات</button>
            </form>
          </div>
        </div>
      )}

      {showRedeem && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setShowRedeem(false)}>
          <div className="n-card n-fade-in" style={{ padding: '30px', width: '100%', maxWidth: '380px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.Gift size={19} /> استبدال نقاط عميل</h2>
            <p style={{ color: 'var(--ink-faint)', fontSize: '13px', marginBottom: '18px' }}>اطلب من العميل الكود اللي طلع له بعد الاستبدال</p>
            <form onSubmit={handleRedeemCode}>
              <input required className="n-input" style={{ textAlign: 'center', letterSpacing: '4px', marginBottom: '14px', textTransform: 'uppercase' }}
                placeholder="XXXXXX" value={redeemCode} onChange={e => setRedeemCode(e.target.value)} />
              <button type="submit" className="n-btn n-btn-primary" style={{ width: '100%', padding: '14px' }}>تحقق وفعّل</button>
            </form>
            {redeemResult && (
              <div style={{ marginTop: '14px', padding: '12px', borderRadius: 'var(--r-md)', textAlign: 'center', fontWeight: '800', fontSize: '14px', background: redeemResult.ok ? 'var(--success-tint)' : 'var(--danger-tint)', color: redeemResult.ok ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {redeemResult.ok ? <Icons.Check size={16} /> : <Icons.AlertTriangle size={16} />} {redeemResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="sheet-overlay" style={{ alignItems: 'center' }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="n-card n-fade-in" style={{ padding: '32px', width: '100%', maxWidth: '380px', margin: '20px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'var(--danger-tint)', color: 'var(--danger)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Icons.Logout />
            </div>
            <h2 style={{ margin: '0 0 10px 0', color: 'var(--ink)' }}>تأكيد تسجيل الخروج</h2>
            <p style={{ color: 'var(--ink-faint)', marginBottom: '25px', fontSize: '15px', fontWeight: '600' }}>
              هل أنت متأكد من رغبتك في تقفيل الوردية وتسجيل الخروج من النظام؟
            </p>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="n-btn n-btn-outline" style={{ flex: 1, padding: '13px' }} onClick={() => setShowLogoutConfirm(false)}>
                <Icons.Close /> إلغاء
              </button>
              <button
                className="n-btn"
                style={{ flex: 1, padding: '13px', background: 'var(--danger)', color: 'white' }}
                onClick={() => { setCurrentUser(null); setShowLogoutConfirm(false); }}
              >
                <Icons.Logout /> تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierView;
