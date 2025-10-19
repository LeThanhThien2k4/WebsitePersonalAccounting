import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function Dashboard() {
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/ledgers/S1"), // Doanh thu
      api.get("/ledgers/S3"), // Chi phí
      api.get("/ledgers/S6"), // Sổ quỹ tiền mặt
    ])
      .then(([s1, s3, s6]) => {
        const income = s1.data.total || 0;
        const expense = s3.data.total || 0;
        const balance = s6.data.balance || 0;
        setSummary({ income, expense, balance });
      })
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Tổng quan kế toán</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
          <h2 className="text-lg font-semibold text-green-700">Doanh thu (S1)</h2>
          <p className="text-2xl font-bold mt-2">
            {summary.income.toLocaleString("vi-VN")} đ
          </p>
        </div>

        <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
          <h2 className="text-lg font-semibold text-red-700">Chi phí (S3)</h2>
          <p className="text-2xl font-bold mt-2">
            {summary.expense.toLocaleString("vi-VN")} đ
          </p>
        </div>

        <div className="p-4 bg-blue-100 border border-blue-300 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-700">Tồn quỹ (S6)</h2>
          <p className="text-2xl font-bold mt-2">
            {summary.balance.toLocaleString("vi-VN")} đ
          </p>
        </div>
      </div>
    </div>
  );
}
