import React, { useState } from "react";
import api from "../utils/requests";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", { name, email, password });
      alert("Đăng ký thành công!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.error || "Lỗi đăng ký");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4
                    bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl p-8
                   border border-gray-200"
      >
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-neutral-900">Tạo tài khoản</h2>
          <p className="text-sm text-neutral-500 mt-1">Dùng email công việc để dễ quản trị</p>
        </div>

        <label className="block text-sm font-medium text-neutral-700 mb-1">Họ tên</label>
        <input
          type="text"
          placeholder="Nguyễn Văn A"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
                     placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-blue-500 mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
        <input
          type="email"
          placeholder="you@company.com"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
                     placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-blue-500 mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="block text-sm font-medium text-neutral-700 mb-1">Mật khẩu</label>
        <input
          type="password"
          placeholder="Tối thiểu 8 ký tự"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
                     placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-blue-500 mb-5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-medium text-white
                     hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
        >
          Đăng ký
        </button>

        <p className="text-sm text-center mt-4 text-neutral-600">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
}
