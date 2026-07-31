import React, { useState, useEffect, useRef } from "react";
import { supabase, mapOrderedRow } from "../supabase";

// استدعاء المكونات
import Sidebar from "./Sidebar";
import Header from "./Header";
import Reports from "./Reports";
import LiveOrders from "./LiveOrders";
import Inventory from "./Inventory";
import CategoriesManager from "./CategoriesManager";
import Invoices from "./Invoices";
import Customers from "./Customers";
import Users from "./Users";
import AdminLogin from "./AdminLogin";
import AdminRoles from "./AdminRoles";
import AuditLog from "./AuditLog";
import Rewards from "./Rewards";
import "../styles/theme.css";

const GlobalStyle = () => (

  <style>{`
      body, html {
        margin: 0;
        padding: 0;
        background-color: var(--paper);
        direction: rtl;
        color: var(--ink);
        overflow: hidden;
        height: 100vh;
        width: 100vw;
      }

      .admin-layout { display: flex; height: 100%; width: 100%; }
      .main-wrapper { flex: 1; display: flex; flex-direction: column; height: 100%; overflow: hidden; }
      .main-content { flex: 1; padding: 32px 38px; overflow-y: auto; height: 100%; }

      /* legacy class names kept as aliases so not-yet-restyled pages still pick up the theme */
      .card { background: var(--paper-raised); border-radius: var(--r-lg); padding: 25px; border: 1px solid var(--line); margin-bottom: 25px; box-shadow: var(--shadow-sm); transition: 0.3s; }
      .card:hover { box-shadow: var(--shadow-md); }
      .section-title { font-size: 23px; font-weight: 900; color: var(--ink); margin: 0 0 20px 0; }

      table { width: 100%; border-collapse: separate; border-spacing: 0; text-align: right; }
      th { padding: 15px; color: var(--ink-faint); font-size: 12.5px; font-weight: 700; border-bottom: 2px solid var(--paper); background: var(--paper); text-transform: uppercase; }
      th:first-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
      th:last-child { border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
      td { padding: 16px 15px; border-bottom: 1px solid var(--paper); font-size: 14px; font-weight: 700; color: var(--ink); vertical-align: middle; }
      tr:hover td { background: var(--paper); }

      .btn { padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(22,33,58,0.05); }
      .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(22,33,58,0.1); }
      .btn-teal { background: linear-gradient(135deg, var(--teal), var(--teal-deep)); color: white; }
      .btn-dark { background: linear-gradient(135deg, var(--ink), #1E2A44); color: white; }
      .btn-outline { background: var(--paper-raised); border: 1px solid var(--line); color: var(--ink-soft); box-shadow: none; }
      .btn-outline:hover { border-color: var(--ink-faint); color: var(--ink); }

      input, select { width: 100%; padding: 14px 18px; border-radius: 12px; border: 1px solid var(--line); background: var(--paper); outline: none; margin-bottom: 15px; font-size: 14px; font-weight: 600; color: var(--ink); transition: 0.2s; }
      input:focus, select:focus { border-color: var(--teal); background: var(--paper-raised); box-shadow: 0 0 0 3px var(--teal-tint); }

      .badge { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; }
      .badge-success { background: var(--success-tint); color: var(--success); }
      .badge-danger { background: var(--danger-tint); color: var(--danger); }
      .badge-warning { background: var(--warning-tint); color: var(--warning); }
      .badge-info { background: var(--info-tint); color: var(--info); }

      .modal-overlay { position: fixed; inset: 0; background: rgba(22,33,58,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; animation: fadeIn 0.2s ease-out; }
      .modal-content { background: var(--paper-raised); border-radius: 24px; padding: 35px; width: 100%; max-width: 450px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); animation: slideUp 0.3s ease-out; }

      .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
);

const AdminDashboard = () => {
  const [session, setSession] = useState(undefined); // undefined = still checking, null = logged out
  const [adminRole, setAdminRole] = useState(null); // 'مدير عام' | 'مشرف'
  const [activeTab, setActiveTab] = useState("reports");

  // Data States
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const prevStockRef = useRef({});

  const LOW_STOCK_THRESHOLD = 5;
  const lowStockProducts = products.filter(p => p.trackStock && Number(p.stock) <= LOW_STOCK_THRESHOLD);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setAdminRole(null); return; }
    supabase.rpc('rpc_ensure_admin_profile').then(({ data }) => {
      if (data && data.length > 0) setAdminRole(data[0].role);
    });
  }, [session]);

  useEffect(() => {
    if (session && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [session]);

  useEffect(() => {
    if (!products.length) return;
    const prevStock = prevStockRef.current;
    products.forEach(p => {
      const isLowNow = p.trackStock && Number(p.stock) <= LOW_STOCK_THRESHOLD;
      const wasLowBefore = prevStock[p.id] !== undefined && prevStock[p.id] <= LOW_STOCK_THRESHOLD;
      if (isLowNow && !wasLowBefore && "Notification" in window && Notification.permission === "granted") {
        new Notification("⚠️ مخزون منخفض", { body: `${p.name} — باقي ${p.stock} بس` });
      }
    });
    const next = {};
    products.forEach(p => { if (p.trackStock) next[p.id] = Number(p.stock); });
    prevStockRef.current = next;
  }, [products]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // staff list goes through a SECURITY DEFINER RPC — the raw table has no
  // anon select policy at all, so passwords/PINs never travel as a plain query
  const fetchUsers = async () => {
    const { data } = await supabase.rpc('rpc_list_staff');
    if (data) setUsers(data);
  };

  useEffect(() => {
    if (!session) return;

    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (data) setOrders(data.map(mapOrderedRow));
    };
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*');
      if (data) setProducts(data.map(mapOrderedRow).sort((a, b) => (a.order || 0) - (b.order || 0)));
    };
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data.map(mapOrderedRow).sort((a, b) => (a.order || 0) - (b.order || 0)));
    };
    const fetchRewards = async () => {
      const { data } = await supabase.from('rewards').select('*');
      if (data) setRewards(data.map(mapOrderedRow));
    };

    fetchOrders(); fetchProducts(); fetchCategories(); fetchUsers(); fetchRewards();

    const channel = supabase.channel('admin-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, fetchRewards)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        جاري التحقق من الجلسة...
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onLoggedIn={setSession} />;
  }

  return (
    <div className="admin-layout">
      <GlobalStyle />
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={adminRole} />
      
      <div className="main-wrapper">
        <Header user={{ name: session.user.email, role: adminRole || "..." }} onLogout={handleLogout} />
        
        <div className="main-content">
          {lowStockProducts.length > 0 && activeTab !== 'inventory' && (
            <div
              className="n-card n-fade-in"
              style={{ padding: '14px 20px', marginBottom: '20px', background: 'var(--danger-tint)', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', cursor: 'pointer' }}
              onClick={() => setActiveTab('inventory')}
            >
              <span style={{ color: 'var(--danger)', fontWeight: '800', fontSize: '13.5px' }}>
                ⚠️ {lowStockProducts.length} صنف على وشك النفاد: {lowStockProducts.slice(0, 3).map(p => p.name).join('، ')}{lowStockProducts.length > 3 ? '...' : ''}
              </span>
              <span className="n-btn n-btn-outline" style={{ padding: '6px 14px', fontSize: '12px' }}>اعرض المخزون →</span>
            </div>
          )}
          {activeTab === 'reports' && <Reports orders={orders} products={products} />}
          {activeTab === 'live_orders' && <LiveOrders orders={orders} />}
          {activeTab === 'inventory' && <Inventory products={products} categories={categories} />}
          {activeTab === 'categories' && <CategoriesManager categories={categories} products={products} />}
          {activeTab === 'invoices' && <Invoices orders={orders} />}
          {activeTab === 'customers' && <Customers orders={orders} />}
          {activeTab === 'rewards' && <Rewards rewards={rewards} />}
          {activeTab === 'users' && adminRole && <Users users={users} onChange={fetchUsers} adminRole={adminRole} />}
          {activeTab === 'admin_roles' && adminRole === 'مدير عام' && <AdminRoles />}
          {activeTab === 'audit_log' && adminRole === 'مدير عام' && <AuditLog />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;