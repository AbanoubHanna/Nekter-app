import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// استدعاء الصفحات - تأكد أن الأسماء مطابقة لأسماء الملفات عندك
import CustomerView from "./pages/CustomerView";
import CashierView from "./pages/CashierView";
import AdminDashboard from "./pages/AdminDashboard";
import Uploader from "./pages/Uploader"; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CustomerView />} />
        <Route path="/cashier" element={<CashierView />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/upload-data" element={<Uploader />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;