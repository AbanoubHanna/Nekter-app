import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// كل شاشة بتتحمّل بس وقت ما حد يفتحها فعليًا (code splitting) — عشان
// عميل بيمسح QR للمنيو ميحملش كود لوحة التحكم والتقارير اللي مش محتاجه.
const CustomerView = lazy(() => import("./pages/CustomerView"));
const CashierView = lazy(() => import("./pages/CashierView"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const RouteLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
    <img src="/logo.png" alt="Nekter" style={{ height: '48px', filter: 'brightness(0)', opacity: 0.6 }} />
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<CustomerView />} />
          <Route path="/cashier" element={<CashierView />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;