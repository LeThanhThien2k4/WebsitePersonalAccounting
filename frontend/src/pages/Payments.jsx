import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function Payments() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    date: "",
    payee: "",
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
      setForm({ date: "", payee: "", reason: "", amount: "", method: "cash" });
      loadData();
    } catch (err) {
      console.error("❌ Lỗi khi lưu phiếu chi:", err);
      alert("Lỗi khi lưu phiếu chi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">💸 Phiếu chi (02-TT)</h2>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-neutral-700 mb-1">Ngày</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-neutral-700 mb-1">Người nhận</label>
            <input
              type="text"
              value={form.payee}
              onChange={(e) => setForm({ ...form, payee: e.target.value })}
              placeholder="Nguyễn Văn B"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col lg:col-span-2">
            <label className="text-sm font-medium text-neutral-700 mb-1">Lý do</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Chi tiền nhập hàng"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-neutral-700 mb-1">Số tiền</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-neutral-700 mb-1">Phương thức</label>
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Tiền mặt</option>
              <option value="bank">Chuyển khoản</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {loading ? "Đang lưu..." : "Lưu phiếu chi"}
          </button>
        </div>
      </form>

      {/* Bảng */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 sticky top-0 z-10">
              <tr className="text-left text-neutral-700">
                <th className="p-3">Ngày</th>
                <th className="p-3">Người nhận</th>
                <th className="p-3">Lý do</th>
                <th className="p-3">Số tiền</th>   {/* bỏ text-right */}
                <th className="p-3">PTTT</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-t hover:bg-neutral-50">
                  <td className="p-3">{new Date(p.date).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3">{p.payee}</td>
                  <td className="p-3">{p.reason}</td>
                  <td className="p-3">{Number(p.amount).toLocaleString("vi-VN")} đ</td> {/* bỏ text-right */}
                  <td className="p-3">{p.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}</td>
                </tr>
              ))}
              {/* ... */}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
