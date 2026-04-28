import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Home, FileText, Wallet, Archive, Users, BookOpen, IdCard } from "lucide-react";

const links = [
  { to: "/", label: "Trang chủ", icon: <Home size={18} /> },
  { to: "/receipts", label: "Phiếu thu", icon: <Wallet size={18} /> },
  { to: "/payments", label: "Phiếu chi", icon: <FileText size={18} /> },
  { to: "/inventory", label: "Tồn kho", icon: <Archive size={18} /> },
  { to: "/payroll", label: "Lương", icon: <Users size={18} /> },
  { to: "/employees", label: "Nhân viên", icon: <IdCard size={18} /> },
  { to: "/ledgers", label: "Sổ kế toán", icon: <BookOpen size={18} /> },
  { to: "/reports", label: "Báo cáo", icon: <BookOpen size={18} /> },
  { to: "/profile", label: "Hồ sơ doanh nghiệp", icon: <IdCard size={18} /> },
];

const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

export default function MainLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col p-4">
        <h1 className="text-xl font-bold mb-6">Kế toán HKD</h1>
        <nav className="flex flex-col gap-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md ${
                  isActive ? "bg-slate-700" : "hover:bg-slate-800"
                }`
              }
            >
              {l.icon} {l.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="w-full text-left text-red-500 hover:text-red-700 mt-6"
        >
          Đăng xuất
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
