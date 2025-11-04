// frontend/src/pages/VoucherMockupTT88.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";

/* ---------------- Bảng hàng hóa ---------------- */
function LineItemsTable({ rows, setRows, editable = true, isEntry }) {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    api.get("/inventory/items").then((res) => setInventory(res.data));
  }, []);

  const update = (idx, key, val) => {
    const clone = [...rows];
    clone[idx] = { ...clone[idx], [key]: val };
    clone[idx].amount =
      Number(clone[idx].qtyActual || 0) * Number(clone[idx].unitPrice || 0);
    setRows(clone);
  };

  const selectItem = (idx, id) => {
    const item = inventory.find((i) => i.id === Number(id));
    if (!item) return;
    const clone = [...rows];
    clone[idx] = {
      ...clone[idx],
      itemId: item.id,
      name: item.name,
      code: item.code,
      unit: item.unit,
      unitPrice: item.unitPriceIn || 0,
    };
    setRows(clone);
  };

  const addRow = () =>
    setRows([
      ...rows,
      {
        itemId: null,
        name: "",
        code: "",
        unit: "",
        qtyDocumented: "",
        qtyActual: "",
        unitPrice: "",
        amount: 0,
      },
    ]);

  const removeRow = (idx) => {
    const clone = [...rows];
    clone.splice(idx, 1);
    setRows(clone);
  };

  return (
    <div className="overflow-auto">
      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border p-2">STT</th>
            <th className="border p-2">Tên hàng (chọn từ kho)</th>
            <th className="border p-2">Mã</th>
            <th className="border p-2">ĐVT</th>
            <th className="border p-2">Theo chứng từ</th>
            <th className="border p-2">{isEntry ? "Thực nhập" : "Thực xuất"}</th>
            <th className="border p-2">Đơn giá</th>
            <th className="border p-2">Thành tiền</th>
            {editable && <th className="border p-2">Xóa</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border text-center">{i + 1}</td>
              <td className="border p-1">
                <select
                  value={r.itemId || ""}
                  onChange={(e) => selectItem(i, e.target.value)}
                  className="border w-full p-1"
                >
                  <option value="">-- Chọn hàng hóa --</option>
                  {inventory.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border text-center">{r.code}</td>
              <td className="border text-center">{r.unit}</td>
              <td className="border text-right">
                <input
                  value={r.qtyDocumented}
                  onChange={(e) => update(i, "qtyDocumented", e.target.value)}
                  className="w-full border p-1 text-right"
                />
              </td>
              <td className="border text-right">
                <input
                  value={r.qtyActual}
                  onChange={(e) => update(i, "qtyActual", e.target.value)}
                  className="w-full border p-1 text-right"
                />
              </td>
              <td className="border text-right">
                <input
                  value={r.unitPrice}
                  onChange={(e) => update(i, "unitPrice", e.target.value)}
                  className="w-full border p-1 text-right"
                />
              </td>
              <td className="border text-right">
                {Number(r.amount || 0).toLocaleString()}
              </td>
              {editable && (
                <td className="border text-center">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-red-600 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editable && (
        <button
          onClick={addRow}
          className="mt-2 px-3 py-1 border rounded hover:bg-gray-100"
        >
          + Thêm dòng
        </button>
      )}
    </div>
  );
}

/* ---------------- Component chính ---------------- */
export default function VoucherMockupTT88({ type: initialType = "PNK" }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [type, setType] = useState(initialType);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [voucherId, setVoucherId] = useState(null);

  const [touched, setTouched] = useState({});
  const [info, setInfo] = useState({
    businessName: "",
    address: "",
    voucherNo: "",
    supplier: "",
    receiver: "",
    reason: "",
    location: "",
  });
  const [rows, setRows] = useState([
    {
      itemId: null,
      name: "",
      code: "",
      unit: "",
      qtyDocumented: "",
      qtyActual: "",
      unitPrice: "",
      amount: 0,
    },
  ]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [rows]
  );

  const required = (field) =>
    touched[field] && !info[field]?.trim()
      ? "border-red-500"
      : "border-gray-300";
  const markTouched = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const isValid =
    info.businessName.trim() &&
    info.address.trim() &&
    info.location.trim() &&
    rows.length > 0 &&
    total > 0 &&
    !rows.some((r) => !r.itemId || Number(r.qtyActual) <= 0);

  /* === Lưu phiếu === */
  const saveVoucher = async () => {
    if (saving) return;
    setTouched({ businessName: true, address: true, location: true });
    if (!isValid) return toast.error("Vui lòng nhập đủ thông tin bắt buộc");

    try {
      setSaving(true);
      const payload = { ...info, type, items: rows, totalAmount: total };
      const res = await api.post("/inventory/voucher", payload);
      const vid = res.data.voucher?.id;
      setVoucherId(vid);
      setSaved(true);
      toast.success("✅ Đã lưu phiếu thành công! Có thể xuất PDF.");
    } catch (err) {
      console.error("❌ Lỗi lưu phiếu:", err.response?.data || err.message);
      toast.error("Lưu phiếu thất bại!");
    } finally {
      setSaving(false);
    }
  };

  /* === Xuất PDF === */
  const exportPDF = async () => {
    const exportId = voucherId || id;
    if (!exportId)
      return toast.error("Chỉ có thể xuất PDF sau khi đã lưu phiếu");
    try {
      toast.loading("Đang tạo PDF...", { id: "pdf" });
      const res = await api.get("/export/inventory/pdf", {
        params: { id: exportId, type },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${info.voucherNo || "phieu"}_${type}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("📄 Xuất PDF thành công!", { id: "pdf" });
      setTimeout(() => nav("/inventory/voucher"), 1000);
    } catch (err) {
      console.error("❌ Xuất PDF lỗi:", err);
      toast.error("Không thể xuất PDF", { id: "pdf" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-2">
        {type === "PNK"
          ? "Phiếu Nhập Kho (03-VT)"
          : "Phiếu Xuất Kho (04-VT)"}
      </h2>

      {/* FORM THÔNG TIN */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label>Hộ, cá nhân kinh doanh *</label>
          <input
            className={`border rounded w-full px-2 py-1 mb-1 ${required(
              "businessName"
            )}`}
            value={info.businessName}
            onBlur={() => markTouched("businessName")}
            onChange={(e) =>
              setInfo({ ...info, businessName: e.target.value })
            }
          />
          <label>Địa chỉ *</label>
          <input
            className={`border rounded w-full px-2 py-1 mb-1 ${required(
              "address"
            )}`}
            value={info.address}
            onBlur={() => markTouched("address")}
            onChange={(e) => setInfo({ ...info, address: e.target.value })}
          />
          <label>Số phiếu</label>
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            value={info.voucherNo}
            onChange={(e) =>
              setInfo({ ...info, voucherNo: e.target.value })
            }
          />
        </div>

        <div>
          <label>Người giao/nhận</label>
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            value={info.supplier || info.receiver}
            onChange={(e) =>
              setInfo({
                ...info,
                supplier: e.target.value,
                receiver: e.target.value,
              })
            }
          />
          <label>Địa điểm nhập/xuất *</label>
          <input
            className={`border rounded w-full px-2 py-1 mb-1 ${required(
              "location"
            )}`}
            value={info.location}
            onBlur={() => markTouched("location")}
            onChange={(e) => setInfo({ ...info, location: e.target.value })}
          />
          <label>Lý do / ghi chú</label>
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            value={info.reason}
            onChange={(e) => setInfo({ ...info, reason: e.target.value })}
          />
        </div>
      </div>

      {/* BẢNG HÀNG */}
      <LineItemsTable
        rows={rows}
        setRows={setRows}
        editable={true}
        isEntry={type === "PNK"}
      />

      {/* NÚT HÀNH ĐỘNG */}
      <div className="flex justify-between mt-4 items-center">
        <div>
          Tổng tiền: <b>{total.toLocaleString()} đ</b>
        </div>
        <div className="flex gap-3">
          <button
            onClick={saveVoucher}
            disabled={!isValid || saving}
            className={`flex items-center gap-1 px-4 py-2 rounded text-white ${
              isValid && !saving
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            💾 {saving ? "Đang lưu..." : "Lưu phiếu"}
          </button>

          <button
            onClick={exportPDF}
            disabled={!saved}
            className={`flex items-center gap-1 px-4 py-2 rounded border ${
              saved
                ? "hover:bg-gray-100"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            📄 Xuất PDF
          </button>
        </div>
      </div>
    </div>
  );
}
