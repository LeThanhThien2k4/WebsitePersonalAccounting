import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function Reports() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/ledgers/S7").then((res) => setData(res.data.ledger || []));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">📑 Báo cáo tổng hợp (S1–S7)</h2>
      <p className="text-sm text-neutral-600">
        Dữ liệu lấy từ backend tự động tổng hợp các sổ kế toán.
      </p>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 sticky top-0 z-10">
              <tr className="text-left text-neutral-700">
                <th className="p-3">Ngày</th>
                <th className="p-3">Loại</th>
                <th className="p-3">Lý do</th>
                <th className="p-3 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t hover:bg-neutral-50">
                  <td className="p-3">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="p-3">{r.type}</td>
                  <td className="p-3">{r.reason}</td>
                  <td
                    className={`p-3 text-right ${
                      r.amount < 0 ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {Number(r.amount).toLocaleString("vi-VN")} đ
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-neutral-500" colSpan={4}>
                    Chưa có dữ liệu báo cáo.
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
