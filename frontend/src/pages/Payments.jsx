import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function Payments() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    date: "",
    payee: "", // 👈 đổi tên cho khớp Prisma
    reason: "",
    amount: "",
    method: "cash",
  });
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    api.get("/journals/payments").then((res) => setData(res.data));
  };

  useEffect(loadData, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.payee || !form.amount)
      return alert("Vui lòng nhập đầy đủ thông tin!");

    setLoading(true);
    try {
      await api.post("/journals/payments", {
        ...form,
        amount: Number(form.amount),
      });
      setForm({
        date: "",
        payee: "",
        reason: "",
        amount: "",
        method: "cash",
      });
      loadData();
    } catch (err) {
      console.error("❌ Lỗi khi lưu phiếu chi:", err);
      alert("Lỗi khi lưu phiếu chi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">💸 Phiếu chi (02-TT)</h2>

      {/* Form nhập */}
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
          <label className="text-sm font-semibold">Người nhận</label>
          <input
            type="text"
            value={form.payee}
            onChange={(e) => setForm({ ...form, payee: e.target.value })}
            className="border rounded p-2"
            placeholder="Nguyễn Văn B"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold">Lý do</label>
          <input
            type="text"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="border rounded p-2"
            placeholder="Chi tiền nhập hàng"
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
          {loading ? "Đang lưu..." : "Lưu phiếu chi"}
        </button>
      </form>

      {/* Bảng danh sách */}
      <table className="w-full border border-gray-300 text-sm bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Ngày</th>
            <th className="p-2 border">Người nhận</th>
            <th className="p-2 border">Lý do</th>
            <th className="p-2 border text-right">Số tiền</th>
            <th className="p-2 border">PTTT</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="p-2 border">
                {new Date(p.date).toLocaleDateString("vi-VN")}
              </td>
              <td className="p-2 border">{p.payee}</td>
              <td className="p-2 border">{p.reason}</td>
              <td className="p-2 border text-right">
                {Number(p.amount).toLocaleString("vi-VN")} đ
              </td>
              <td className="p-2 border">
                {p.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
