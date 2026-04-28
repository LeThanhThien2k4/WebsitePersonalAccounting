// frontend/src/components/PayrollTable.jsx
import React, { useState, useEffect } from "react";
import api from "../api/axios";

const FIELDS = [
  { key: "salaryBase", label: "LCB" },
  { key: "daysWorked", label: "Công" },
  { key: "otHours", label: "OT" },
  { key: "allowances", label: "Phụ cấp" },
  { key: "bonus", label: "Thưởng" },
  { key: "otherIncome", label: "Thu khác" },
  { key: "deductUnpaid", label: "Khấu trừ KL" },
  { key: "advance", label: "Tạm ứng" },
];

export default function PayrollTable({ period, onChanged }) {
  const [savingId, setSavingId] = useState(null);
  const [localData, setLocalData] = useState(period.items || []);

  // ✅ Sửa: dùng useEffect (không phải useState) để đồng bộ khi period thay đổi
  useEffect(() => {
    setLocalData(period.items || []);
  }, [period.items]);

  const updateLocalCell = (rowId, key, value) => {
    setLocalData((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [key]: value } : r))
    );
  };

  const saveCell = async (row, key, value) => {
    setSavingId(row.id);
    try {
      await api.patch(`/payrolls/items/${row.id}`, { [key]: Number(value) });
      await onChanged(); // reload lại từ DB
    } catch (e) {
      console.error("Lỗi cập nhật ô:", e);
    } finally {
      setSavingId(null);
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
  const items = Array.isArray(localData) ? localData : [];

  const totals = items.reduce(
    (a, r) => {
      a.gross += Number(r.gross || 0);
      a.netPay += Number(r.netPay || 0);
      return a;
    },
    { gross: 0, netPay: 0 }
  );

  return (
    <div className="border rounded overflow-auto">
      <table className="min-w-[1200px] w-full">
        <thead className="bg-gray-50">
          <tr className="text-left text-sm">
            <th className="p-2">STT</th>
            <th className="p-2">Mã NV</th>
            <th className="p-2">Họ tên</th>
            {FIELDS.map((f) => (
              <th key={f.key} className="p-2">
                {f.label}
              </th>
            ))}
            <th className="p-2">BHXH</th>
            <th className="p-2">BHYT</th>
            <th className="p-2">BHTN</th>
            <th className="p-2">CĐ</th>
            <th className="p-2">Gross</th>
            <th className="p-2">Net</th>
          </tr>
        </thead>

        <tbody className="text-sm">
          {items.map((r, idx) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{idx + 1}</td>
              <td className="p-2">{r.employee?.code || ""}</td>
              <td className="p-2">{r.employee?.fullName || ""}</td>

              {FIELDS.map((f) => (
                <td key={f.key} className="p-2">
                  <input
                    type="number"
                    value={r[f.key] ?? ""}
                    onChange={(e) =>
                      updateLocalCell(r.id, f.key, e.target.value)
                    }
                    onBlur={(e) => saveCell(r, f.key, e.target.value)}
                    disabled={
                      period.status === "LOCKED" || savingId === r.id
                    }
                    onFocus={(e) => e.target.select()}
                    className="w-28 border rounded px-2 py-1 text-right"
                  />
                </td>
              ))}

              <td className="p-2 text-right">{fmt(r.bhxhEmp)}</td>
              <td className="p-2 text-right">{fmt(r.bhytEmp)}</td>
              <td className="p-2 text-right">{fmt(r.bhtnEmp)}</td>
              <td className="p-2 text-right">{fmt(r.unionEmp)}</td>
              <td className="p-2 text-right font-medium">{fmt(r.gross)}</td>
              <td className="p-2 text-right font-semibold">{fmt(r.netPay)}</td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="border-t bg-gray-50 text-sm">
            <td className="p-2" colSpan={FIELDS.length + 7}>
              Tổng
            </td>
            <td className="p-2 text-right font-medium">
              {totals.gross.toLocaleString("vi-VN")}
            </td>
            <td className="p-2 text-right font-semibold">
              {totals.netPay.toLocaleString("vi-VN")}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
