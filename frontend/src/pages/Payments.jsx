// frontend/src/pages/Payments.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axios";
import toast, { Toaster } from "react-hot-toast";

export default function Payments() {
  const [data, setData] = useState([]);
  const [profile, setProfile] = useState({});
  const [form, setForm] = useState({
    date: "",
    payee: "",
    reason: "",
    amount: "",
    method: "cash",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [u, p] = await Promise.all([
          api.get("/users/profile"),
          api.get("/journals/payments"),
        ]);
        setProfile(u.data || {});
        setData(p.data || []);
      } catch {
        toast.error("Không tải được dữ liệu phiếu chi");
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.date) return toast.error("Vui lòng chọn ngày");
    if (!form.payee.trim()) return toast.error("Vui lòng nhập người nhận");

    const amountNum = Number(form.amount);
    if (!form.amount || !Number.isFinite(amountNum) || amountNum <= 0) {
      return toast.error("Số tiền phải lớn hơn 0");
    }

    setLoading(true);
    try {
      await api.post("/journals/payments", {
        ...form,
        amount: amountNum,
      });

      toast.success("✅ Đã lưu phiếu chi");

      const res = await api.get("/journals/payments");
      setData(res.data || []);

      setForm({
        date: "",
        payee: "",
        reason: "",
        amount: "",
        method: "cash",
      });
    } catch (err) {
      const msg = err.response?.data?.error || "❌ Lỗi khi lưu phiếu chi";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (row) => {
    try {
      toast.loading("Đang xuất PDF...", { id: `p-${row.id}` });

      const res = await api.get("/export/payment/pdf", {
        params: { id: row.id },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phieu-chi-${row.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("📄 Đã tải phiếu chi", { id: `p-${row.id}` });
    } catch (e) {
      console.error(e);
      toast.error("❌ Xuất PDF thất bại", { id: `p-${row.id}` });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa phiếu chi này?")) return;
    try {
      await api.delete(`/journals/payments/${id}`);
      setData((prev) => prev.filter((p) => p.id !== id));
      toast.success("🗑️ Đã xóa phiếu chi");
    } catch (err) {
      const msg = err.response?.data?.error || "❌ Không thể xóa phiếu chi";
      toast.error(msg);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold mb-4">💸 Phiếu chi (02-TT)</h2>

      {/* Form nhập phiếu chi */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-lg shadow"
      >
        <div className="flex flex-col">
          <label>Ngày</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm({ ...form, date: e.target.value })
            }
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col">
          <label>Người nhận</label>
          <input
            value={form.payee}
            onChange={(e) =>
              setForm({ ...form, payee: e.target.value })
            }
            className="border rounded p-2"
            placeholder="Nguyễn Văn B"
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
            placeholder="Chi tiền nhập hàng"
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
            {loading ? "Đang lưu..." : "Lưu phiếu chi"}
          </button>
        </div>
      </form>

      {/* Bảng dữ liệu */}
      <table className="w-full border text-sm bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Ngày</th>
            <th className="p-2 border">Người nhận</th>
            <th className="p-2 border">Lý do</th>
            <th className="p-2 border text-right">Số tiền</th>
            <th className="p-2 border">PTTT</th>
            <th className="p-2 border text-center">Hành động</th>
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
              <td className="p-2 border text-center space-x-2">
                <button
                  onClick={() => handleExport(p)}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Xuất PDF
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
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
                Chưa có phiếu chi nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
