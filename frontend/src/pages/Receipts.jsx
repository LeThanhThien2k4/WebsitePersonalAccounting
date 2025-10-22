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

  const loadData = () => {
    api.get("/journals/receipts").then((res) => setData(res.data));
  };

  useEffect(loadData, []);

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">📥 Phiếu thu (01-TT)</h2>
      </div>

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
            <label className="text-sm font-medium text-neutral-700 mb-1">Người nộp</label>
            <input
              type="text"
              value={form.payer}
              onChange={(e) => setForm({ ...form, payer: e.target.value })}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col lg:col-span-2">
            <label className="text-sm font-medium text-neutral-700 mb-1">Lý do</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Thu tiền bán hàng"
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
            {loading ? "Đang lưu..." : "Lưu phiếu thu"}
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
                <th className="p-3">Người nộp</th>
                <th className="p-3">Lý do</th>
                <th className="p-3">Số tiền</th>    {/* bỏ text-right */}
                <th className="p-3">PTTT</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t hover:bg-neutral-50">
                  <td className="p-3">{new Date(r.date).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3">{r.payer}</td>
                  <td className="p-3">{r.reason}</td>
                  <td className="p-3">{Number(r.amount).toLocaleString("vi-VN")} đ</td> {/* bỏ text-right */}
                  <td className="p-3">{r.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-neutral-500" colSpan={5}>
                    Chưa có phiếu thu nào.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
