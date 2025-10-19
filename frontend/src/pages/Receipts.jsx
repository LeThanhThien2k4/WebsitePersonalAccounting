import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function Receipts() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    date: "",
    payer: "",
    reason: "",
    amount: "",
    method: "cash",
  });
  const [loading, setLoading] = useState(false);

  // Lấy danh sách phiếu thu
  const loadData = () => {
    api.get("/journals/receipts").then((res) => setData(res.data));
  };

  useEffect(loadData, []);

  // Gửi POST phiếu thu
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.payer || !form.amount) return alert("Nhập đủ dữ liệu");

    setLoading(true);
    try {
      await api.post("/journals/receipts", {
        ...form,
        amount: Number(form.amount),
      });
      setForm({ date: "", payer: "", reason: "", amount: "", method: "cash" });
      loadData();
    } catch (err) {
      alert("Lỗi khi lưu phiếu thu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📥 Phiếu thu (01-TT)</h2>

      {/* Form thêm mới */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-lg shadow"
      >
        <div className="flex flex-col">
          <label className="text-sm font-semibold">Ngày</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="border rounded p-2"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold">Người nộp</label>
          <input
            type="text"
            value={form.payer}
            onChange={(e) => setForm({ ...form, payer: e.target.value })}
            className="border rounded p-2"
            placeholder="Nguyễn Văn A"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold">Lý do</label>
          <input
            type="text"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="border rounded p-2"
            placeholder="Thu tiền bán hàng"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold">Số tiền</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="border rounded p-2 w-32"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold">Phương thức</label>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            className="border rounded p-2"
          >
            <option value="cash">Tiền mặt</option>
            <option value="bank">Chuyển khoản</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Đang lưu..." : "Lưu phiếu thu"}
        </button>
      </form>

      {/* Bảng danh sách */}
      <table className="w-full border border-gray-300 text-sm bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Ngày</th>
            <th className="p-2 border">Người nộp</th>
            <th className="p-2 border">Lý do</th>
            <th className="p-2 border text-right">Số tiền</th>
            <th className="p-2 border">PTTT</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="p-2 border">{new Date(r.date).toLocaleDateString()}</td>
              <td className="p-2 border">{r.payer}</td>
              <td className="p-2 border">{r.reason}</td>
              <td className="p-2 border text-right">
                {Number(r.amount).toLocaleString("vi-VN")} đ
              </td>
              <td className="p-2 border">{r.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
