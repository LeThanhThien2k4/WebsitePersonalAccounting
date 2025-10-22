import React, { useState } from "react";
import axios from "axios";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const sendOTP = async () => {
    try {
      const res = await axios.post(
        "http://localhost:4000/api/auth/forgot-password",
        { email }
      );
      alert(res.data.message);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.error || "Lỗi gửi OTP, vui lòng thử lại";
      alert(msg);
    }
  };

  const resetPassword = async () => {
    await axios.post("http://localhost:4000/api/auth/reset-password", {
      email,
      otp,
      newPassword,
    });
    alert("Đổi mật khẩu thành công");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4
                    bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl p-8
                      border border-gray-200">
        {step === 1 ? (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-neutral-900">Quên mật khẩu</h2>
              <p className="text-sm text-neutral-500 mt-1">Nhập email để nhận mã OTP</p>
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
            />

            <button
              onClick={sendOTP}
              className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2.5 text-sm font-medium text-white
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Gửi OTP
            </button>
          </>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-neutral-900">Đặt lại mật khẩu</h2>
              <p className="text-sm text-neutral-500 mt-1">Nhập mã OTP và mật khẩu mới</p>
            </div>

            <label className="block text-sm font-medium text-neutral-700 mb-1">Mã OTP</label>
            <input
              type="text"
              placeholder="Nhập mã 6 số"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
                         placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-blue-500 mb-4"
            />

            <label className="block text-sm font-medium text-neutral-700 mb-1">Mật khẩu mới</label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
                         placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500
                         focus:border-emerald-500 mb-5"
            />

            <button
              onClick={resetPassword}
              className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-medium text-white
                         hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500
                         focus:ring-offset-2 transition-colors"
            >
              Đặt lại mật khẩu
            </button>
          </>
        )}
      </div>
    </div>
  );
}
