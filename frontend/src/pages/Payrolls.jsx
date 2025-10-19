import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function Payrolls() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/journals/payrolls").then((res) => setData(res.data));
  }, []);

  const total = data.reduce((s, p) => s + Number(p.total || 0), 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">👥 Bảng lương (05-HKD)</h2>
      <p className="mb-4">
        Tổng chi phí lương: <strong>{total.toLocaleString("vi-VN")} đ</strong>
      </p>
      <table className="w-full border text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 border">Kỳ</th>
            <th className="p-2 border">Số nhân viên</th>
            <th className="p-2 border text-right">Tổng lương</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id}>
              <td className="p-2 border">{p.period}</td>
              <td className="p-2 border">{p.employees?.length || 0}</td>
              <td className="p-2 border text-right">
                {Number(p.total).toLocaleString("vi-VN")} đ
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
