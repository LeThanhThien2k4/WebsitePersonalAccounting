import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function Reports() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/ledgers/S7").then((res) => setData(res.data.ledger || []));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📑 Báo cáo tổng hợp (S1–S7)</h2>
      <p className="mb-4 text-gray-700">
        Dữ liệu lấy từ backend tự động tổng hợp các sổ kế toán.
      </p>

      <table className="w-full border border-gray-300 text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 border">Ngày</th>
            <th className="p-2 border">Loại</th>
            <th className="p-2 border">Lý do</th>
            <th className="p-2 border text-right">Số tiền</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td className="p-2 border">{new Date(r.date).toLocaleDateString()}</td>
              <td className="p-2 border">{r.type}</td>
              <td className="p-2 border">{r.reason}</td>
              <td
                className={`p-2 border text-right ${
                  r.amount < 0 ? "text-red-600" : "text-green-700"
                }`}
              >
                {Number(r.amount).toLocaleString("vi-VN")} đ
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
