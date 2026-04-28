// frontend/src/pages/Receipts.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axios";
import toast, { Toaster } from "react-hot-toast";

export default function Receipts() {
  const [data, setData] = useState([]);
  const [profile, setProfile] = useState({});
  const [form, setForm] = useState({
    date: "",
    payer: "",
    reason: "",
    amount: "",
    method: "cash",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, r] = await Promise.all([
          api.get("/users/profile"),
          api.get("/journals/receipts"),
        ]);
        setProfile(u.data || {});
        setData(r.data || []);
      } catch {
        toast.error("Không tải được dữ liệu phiếu thu");
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.date) return toast.error("Vui lòng chọn ngày");
    if (!form.payer.trim()) return toast.error("Vui lòng nhập người nộp");
    const amountNum = Number(form.amount);
    if (!form.amount || !Number.isFinite(amountNum) || amountNum <= 0) {
      return toast.error("Số tiền phải lớn hơn 0");
    }

    setLoading(true);
    try {
      await api.post("/journals/receipts", {
        ...form,
        amount: amountNum,
      });

      toast.success("✅ Đã lưu phiếu thu");

      const res = await api.get("/journals/receipts");
      setData(res.data || []);

      setForm({
        date: "",
        payer: "",
        reason: "",
        amount: "",
        method: "cash",
      });
    } catch (err) {
      const msg = err.response?.data?.error || "❌ Lỗi khi lưu phiếu thu";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (row) => {
    try {
      toast.loading("Đang xuất PDF...", { id: `r-${row.id}` });
      const res = await api.get("/export/receipt/pdf", {
        params: { id: row.id },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phieu-thu-${row.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("📄 Đã tải phiếu thu", { id: `r-${row.id}` });
    } catch (err) {
      console.error(err);
      toast.error("❌ Xuất PDF thất bại", { id: `r-${row.id}` });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa phiếu thu này?")) return;
    try {
      await api.delete(`/journals/receipts/${id}`);
      setData((prev) => prev.filter((r) => r.id !== id));
      toast.success("🗑️ Đã xóa phiếu thu");
    } catch (err) {
      const msg = err.response?.data?.error || "❌ Không thể xóa phiếu thu";
      toast.error(msg);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold mb-4">📥 Phiếu thu (01-TT)</h2>

      {/* Form nhập phiếu thu */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-lg shadow"
      >
        <div className="flex flex-col">
          <label>Ngày</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col">
          <label>Người nộp</label>
          <input
            value={form.payer}
            onChange={(e) =>
              setForm({ ...form, payer: e.target.value })
            }
            className="border rounded p-2"
            placeholder="Nguyễn Văn A"
          />
        </div>

        <div className="flex flex-col">
          <label>Lý do</label>
          <input
            value={form.reason}
            onChange={(e) =>
              setForm({ ...form, reason: e.target.value })
            }
            className="border rounded p-2"
            placeholder="Thu tiền bán hàng"
          />
        </div>

        <div className="flex flex-col">
          <label>Số tiền</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => {
              const v = e.target.value;
              if (Number(v) < 0) return; // chặn âm
              setForm({ ...form, amount: v });
            }}
            className="border rounded p-2 w-32"
            min="0"
          />
        </div>

        <div className="flex flex-col">
          <label>Phương thức</label>
          <select
            value={form.method}
            onChange={(e) =>
              setForm({ ...form, method: e.target.value })
            }
            className="border rounded p-2"
          >
            <option value="cash">Tiền mặt</option>
            <option value="bank">Chuyển khoản</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Đang lưu..." : "Lưu phiếu thu"}
          </button>
        </div>
      </form>

      {/* Bảng dữ liệu */}
      <table className="w-full border text-sm bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Ngày</th>
            <th className="p-2 border">Người nộp</th>
            <th className="p-2 border">Lý do</th>
            <th className="p-2 border text-right">Số tiền</th>
            <th className="p-2 border">PTTT</th>
            <th className="p-2 border text-center">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="p-2 border">
                {new Date(r.date).toLocaleDateString("vi-VN")}
              </td>
              <td className="p-2 border">{r.payer}</td>
              <td className="p-2 border">{r.reason}</td>
              <td className="p-2 border text-right">
                {Number(r.amount).toLocaleString("vi-VN")} đ
              </td>
              <td className="p-2 border">
                {r.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}
              </td>
              <td className="p-2 border text-center space-x-2">
                <button
                  onClick={() => handleExport(r)}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Xuất PDF
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td className="p-2 border text-center" colSpan={6}>
                Chưa có phiếu thu nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
