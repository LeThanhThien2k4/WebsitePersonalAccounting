import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import ReceiptPDF from "../components/ReceiptPDF.jsx";
import { createRoot } from "react-dom/client";

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
  const pdfRef = useRef();

  // Lấy hồ sơ doanh nghiệp và danh sách phiếu
  useEffect(() => {
    api.get("/users/profile").then((res) => setProfile(res.data || {}));
    api.get("/journals/receipts").then((res) => setData(res.data));
  }, []);

  // Thêm phiếu thu
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.payer || !form.amount)
      return alert("Vui lòng nhập đầy đủ dữ liệu");

    setLoading(true);
    try {
      await api.post("/journals/receipts", {
        ...form,
        amount: Number(form.amount),
      });
      setForm({ date: "", payer: "", reason: "", amount: "", method: "cash" });
      const res = await api.get("/journals/receipts");
      setData(res.data);
    } catch (err) {
      alert("❌ Lỗi khi lưu phiếu thu");
    } finally {
      setLoading(false);
    }
  };

  // Xuất PDF từng phiếu
  const handleExport = async (row) => {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(
      <ReceiptPDF
        info={{
          businessName: profile.businessName || "Hộ/CN kinh doanh",
          address: profile.address || "—",
          payer: row.payer,
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
        pdf.save(`phieu-thu-${row.id}.pdf`);
      } catch (err) {
        console.error("❌ Xuất PDF lỗi:", err);
      } finally {
        root.unmount();
        container.remove();
      }
    }, 300);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📥 Phiếu thu (01-TT)</h2>

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
            onChange={(e) => setForm({ ...form, payer: e.target.value })}
            className="border rounded p-2"
            placeholder="Nguyễn Văn A"
          />
        </div>
        <div className="flex flex-col">
          <label>Lý do</label>
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="border rounded p-2"
            placeholder="Thu tiền bán hàng"
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
            {loading ? "Đang lưu..." : "Lưu phiếu thu"}
          </button>
        </div>
      </form>

      {/* Bảng danh sách */}
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
              <td className="p-2 border text-center">
                <button
                  onClick={() => handleExport(r)}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Xuất PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ position: "absolute", left: -9999 }}>
        <ReceiptPDF ref={pdfRef} info={form} />
      </div>
    </div>
  );
}
