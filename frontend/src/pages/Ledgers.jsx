// frontend/src/pages/Ledgers.jsx
import React, { useState, useEffect } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";

export default function Ledgers() {
  const [type, setType] = useState("S6");
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState({
    totalIn: 0,
    totalOut: 0,
    balance: 0,
  });

  /* ───── Tải dữ liệu ───── */
  const loadData = async () => {
    try {
      const res = await api.get(`/ledgers/${type}`, { params: { from, to } });
      setRows(res.data.ledger || []);
      setSummary({
        totalIn: res.data.totalIn || 0,
        totalOut: res.data.totalOut || 0,
        balance: res.data.balance || 0,
      });
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải dữ liệu sổ kế toán");
    }
  };

  useEffect(() => {
    loadData();
  }, [type]);

  /* ───── Xuất PDF (server-side Puppeteer) ───── */
  const handleExportPDF = async () => {
  if (!rows.length) return toast.error("Không có dữ liệu để xuất PDF");

  toast.loading("Đang tạo PDF...", { id: "pdf" });
  try {
    const res = await api.get(`/ledgers/${type}/export/pdf`, {
      params: { from, to },
      responseType: "arraybuffer", // ✅ dùng arraybuffer thay vì blob
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download =
      type === "S6"
        ? "So_quy_tien_mat.pdf"
        : "So_tien_gui_ngan_hang.pdf";
    a.click();

    window.URL.revokeObjectURL(url);
    toast.success("Xuất PDF thành công", { id: "pdf" });
  } catch (err) {
    console.error(err);
    toast.error("Xuất PDF thất bại", { id: "pdf" });
  }
};

  return (
    <div className="p-6 bg-white rounded shadow">
      {/* Tiêu đề */}
      <h1 className="text-lg font-bold mb-4">
        {type === "S6"
          ? "Sổ quỹ tiền mặt (S6-HKD)"
          : "Sổ tiền gửi ngân hàng (S7-HKD)"}
      </h1>

      {/* Bộ lọc + nút xuất */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option value="S6">Sổ quỹ tiền mặt (S6)</option>
          <option value="S7">Sổ tiền gửi ngân hàng (S7)</option>
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border rounded px-2 py-1"
        />

        <button
          onClick={loadData}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          Lọc dữ liệu
        </button>

        <button
          onClick={handleExportPDF}
          className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
        >
          Xuất PDF
        </button>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border p-2 w-[100px]">Ngày</th>
              <th className="border p-2 w-[60px]">Loại</th>
              <th className="border p-2">Nội dung</th>
              <th className="border p-2 text-right w-[140px]">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="text-center py-3 text-gray-500"
                >
                  Không có dữ liệu trong khoảng này
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="border p-2 text-center">
                    {new Date(r.date).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="border p-2 text-center">{r.type}</td>
                  <td className="border p-2">{r.reason}</td>
                  <td
                    className={`border p-2 text-right ${
                      r.signedAmount >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {r.signedAmount?.toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tổng hợp */}
      <div className="border-t pt-3 text-right space-y-1 text-[15px]">
        <div>
          🔹 Tổng thu: {summary.totalIn.toLocaleString("vi-VN")} đ
        </div>
        <div>
          🔸 Tổng chi: {summary.totalOut.toLocaleString("vi-VN")} đ
        </div>
        <div className="font-semibold">
          💰 Tồn cuối kỳ: {summary.balance.toLocaleString("vi-VN")} đ
        </div>
      </div>
    </div>
  );
}
