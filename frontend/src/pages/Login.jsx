import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:4000/api/auth/login", {
        email,
        password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/");
    } catch (err) {
      alert("Đăng nhập thất bại: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4
                    bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl p-8
                   border border-gray-200"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">Đăng nhập</h1>
          <p className="text-sm text-neutral-500 mt-1">Truy cập hệ thống kế toán nội bộ</p>
        </div>

        <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
        <input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
                     placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-blue-500 mb-4"
          required
        />

        <label className="block text-sm font-medium text-neutral-700 mb-1">Mật khẩu</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
                     placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-blue-500 mb-5"
          required
        />

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2.5 text-sm font-medium text-white
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Đăng nhập
        </button>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-blue-600 hover:underline">
            Quên mật khẩu?
          </Link>
          <div className="text-neutral-600">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              Đăng ký
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Login;
