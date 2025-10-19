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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 shadow-md rounded-lg w-96">
        {step === 1 ? (
          <>
            <h2 className="text-xl font-bold mb-4 text-center">Quên mật khẩu</h2>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 w-full mb-3 rounded"
            />
            <button
              onClick={sendOTP}
              className="bg-blue-600 text-white w-full p-2 rounded hover:bg-blue-700"
            >
              Gửi OTP
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-center">Nhập OTP và mật khẩu mới</h2>
            <input
              type="text"
              placeholder="Mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="border p-2 w-full mb-3 rounded"
            />
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border p-2 w-full mb-3 rounded"
            />
            <button
              onClick={resetPassword}
              className="bg-green-600 text-white w-full p-2 rounded hover:bg-green-700"
            >
              Đặt lại mật khẩu
            </button>
          </>
        )}
      </div>
    </div>
  );
}
