import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function Payrolls() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/journals/payrolls").then((res) => setData(res.data));
  }, []);

  const total = data.reduce((s, p) => s + Number(p.total || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">👥 Bảng lương (05-HKD)</h2>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
        <p className="text-neutral-700">
          Tổng chi phí lương:{" "}
          <strong className="text-neutral-900">{total.toLocaleString("vi-VN")} đ</strong>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 sticky top-0 z-10">
              <tr className="text-left text-neutral-700">
                <th className="p-3">Kỳ</th>
                <th className="p-3">Số nhân viên</th>
                <th className="p-3 text-right">Tổng lương</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-t hover:bg-neutral-50">
                  <td className="p-3">{p.period}</td>
                  <td className="p-3">{p.employees?.length || 0}</td>
                  <td className="p-3 text-right">{Number(p.total).toLocaleString("vi-VN")} đ</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-neutral-500" colSpan={3}>
                    Chưa có dữ liệu bảng lương.
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
