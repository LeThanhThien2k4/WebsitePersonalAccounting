import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { Toaster } from "react-hot-toast";

// Layout & pages
import MainLayout from "./layouts/MainLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Receipts from "./pages/Receipts.jsx";
import Payments from "./pages/Payments.jsx";
import Inventory from "./pages/Inventory.jsx";
import Payrolls from "./pages/Payrolls.jsx";
import Reports from "./pages/Reports.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import VoucherMockupTT88 from "./components/VoucherMockupTT88.jsx";
import VoucherList from "./pages/VoucherList.jsx";
import Profile from "./pages/Profile.jsx";
import Employees from "./pages/Employees.jsx";
import Ledgers from "./pages/Ledgers.jsx";

// ===============================
// ProtectedRoute
// ===============================
function ProtectedRoute() {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// ===============================
// App
// ===============================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* PRIVATE */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />

            {/* Kế toán module */}
            <Route path="receipts" element={<Receipts />} />
            <Route path="payments" element={<Payments />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="payroll" element={<Payrolls />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<Profile />} />
            <Route path="employees" element={<Employees />} />
            <Route path="ledgers" element={<Ledgers />} />

            {/* Phiếu nhập / xuất kho TT88 */}
            <Route path="inventory/voucher" element={<VoucherList />} />
            <Route path="inventory/voucher/new" element={<VoucherMockupTT88 type="PNK" />} />
            <Route path="inventory/voucher/:id" element={<VoucherMockupTT88 type="PNK" />} />
            <Route path="inventory/voucher-out/new" element={<VoucherMockupTT88 type="PXK" />} />
            <Route path="inventory/voucher-out/:id" element={<VoucherMockupTT88 type="PXK" />} />
          </Route>
        </Route>

        {/* Fallback → Không dùng "/" để tránh redirect sai */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2500,
          style: { fontSize: "14px", borderRadius: "8px" },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
