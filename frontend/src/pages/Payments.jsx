import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import PaymentPDF from "../components/PaymentPDF.jsx";
import { createRoot } from "react-dom/client";
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
  const pdfRef = useRef();

  useEffect(() => {
    api.get("/users/profile").then((res) => setProfile(res.data || {}));
    api.get("/journals/payments").then((res) => setData(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.payee || !form.amount)
      return toast.error("Vui lòng nhập đủ thông tin!");
    setLoading(true);
    try {
      await api.post("/journals/payments", {
        ...form,
        amount: Number(form.amount),
      });
      setForm({ date: "", payee: "", reason: "", amount: "", method: "cash" });
      const res = await api.get("/journals/payments");
      setData(res.data);
      toast.success("✅ Đã lưu phiếu chi");
    } catch {
      toast.error("❌ Lỗi khi lưu phiếu chi");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (row) => {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(
      <PaymentPDF
        info={{
          businessName: profile.businessName || "Hộ/CN kinh doanh",
          address: profile.address || "—",
          payee: row.payee,
          reason: row.reason,
          amount: row.amount,
          date: new Date(row.date).toLocaleDateString("vi-VN"),
          method: row.method,
        }}
      />
    );

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(container, { scale: 2 });
        const pdf = new jsPDF("p", "mm", "a4");
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
        pdf.save(`phieu-chi-${row.id}.pdf`);
        toast.success("📄 Xuất PDF thành công");
      } catch {
        toast.error("❌ Xuất PDF thất bại");
      } finally {
        root.unmount();
        container.remove();
      }
    }, 300);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa phiếu chi này?")) return;
    try {
      await api.delete(`/journals/payments/${id}`);
      setData((prev) => prev.filter((p) => p.id !== id));
      toast.success("🗑️ Đã xóa phiếu chi");
    } catch {
      toast.error("❌ Không thể xóa phiếu chi");
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold mb-4">💸 Phiếu chi (02-TT)</h2>

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
          <label>Người nhận</label>
          <input
            value={form.payee}
            onChange={(e) => setForm({ ...form, payee: e.target.value })}
            className="border rounded p-2"
            placeholder="Nguyễn Văn B"
          />
        </div>
        <div className="flex flex-col">
          <label>Lý do</label>
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="border rounded p-2"
            placeholder="Chi tiền nhập hàng"
          />
        </div>
        <div className="flex flex-col">
          <label>Số tiền</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="border rounded p-2 w-32"
          />
        </div>
        <div className="flex flex-col">
          <label>Phương thức</label>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
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
        </tbody>
      </table>

      <div style={{ position: "absolute", left: -9999 }}>
        <PaymentPDF ref={pdfRef} info={form} />
      </div>
    </div>
  );
}
