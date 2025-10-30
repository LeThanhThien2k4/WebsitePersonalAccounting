import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { Toaster } from "react-hot-toast";
import MainLayout from "./layouts/MainLayout.jsx";
import Receipts from "./pages/Receipts.jsx";
import Dashboard from "./pages/Dashboard.jsx";
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
// ===============================
// Component bảo vệ route
// ===============================
function ProtectedRoute() {
  const token = localStorage.getItem("token");
  if (!token) {
    // Nếu chưa đăng nhập thì điều hướng về trang login
    return <Navigate to="/login" replace />;
  }
  return <Outlet />; // Cho phép truy cập các route con
}

// ===============================
// App chính
// ===============================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==== Các route public ==== */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ==== Các route cần đăng nhập ==== */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />

            {/* ==== Module kế toán ==== */}
            <Route path="receipts" element={<Receipts />} />  {/* Phiếu thu */}
            <Route path="payments" element={<Payments />} />  {/* Phiếu chi */}
            <Route path="inventory" element={<Inventory />} />{/* Quản lý kho */}
            <Route path="payroll" element={<Payrolls />} />
            <Route path="reports" element={<Reports />} />    {/* Báo cáo */}
            <Route path="profile" element={<Profile />} />
            <Route path="employees" element={<Employees />} />


            {/* ==== Phiếu nhập / xuất kho theo TT88 ==== */}
            <Route path="inventory/voucher" element={<VoucherList />} />
            <Route path="inventory/voucher/new" element={<VoucherMockupTT88 type="PNK" />} />
            <Route path="inventory/voucher-out/new" element={<VoucherMockupTT88 type="PXK" />} />

          </Route>
        </Route>

        {/* ==== Fallback ==== */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
