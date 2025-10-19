import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import MainLayout from "./layouts/MainLayout.jsx";
import Receipts from "./pages/Receipts.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Payments from "./pages/Payments.jsx";
import Inventory from "./pages/Inventory.jsx";
import Payrolls from "./pages/Payrolls.jsx";
import Reports from "./pages/Reports.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import StockIn from "./pages/StockIn.jsx"
import StockOut from "./pages/StockOut.jsx"
import ForgotPassword from "./pages/ForgotPassword";

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
        {/* Các route public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />


        {/* Các route cần đăng nhập */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="payments" element={<Payments />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="payrolls" element={<Payrolls />} />
            <Route path="reports" element={<Reports />} />
            <Route path="/stock-in" element={<StockIn />} />
            <Route path="/stock-out" element={<StockOut />} />  
          </Route>
        </Route>

        {/* Fallback: nếu URL không tồn tại */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
