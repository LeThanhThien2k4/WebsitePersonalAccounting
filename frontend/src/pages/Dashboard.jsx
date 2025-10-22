import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

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

  const formatVND = (n) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n ?? 0);

  const Card = ({ title, code, value, AccentIcon, accent }) => (
    <div className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-600">
          <AccentIcon className={`h-5 w-5 ${accent}`} />
          <span className={`font-semibold text-2xl text-neutral-900`}>
            {title}
          </span>
          <span
            className={`ml-3 rounded-full border px-2.5 py-[3px] text-sm ${accent} border-current/30`}
          >
            {code}
          </span>
        </div>
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
        {formatVND(value)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        📊 Tổng quan kế toán
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card
          title="Doanh thu"
          code="S1"
          value={summary.income}
          AccentIcon={TrendingUp}
          accent="text-emerald-600"
        />
        <Card
          title="Chi phí"
          code="S3"
          value={summary.expense}
          AccentIcon={TrendingDown}
          accent="text-rose-600"
        />
        <Card
          title="Tồn quỹ"
          code="S6"
          value={summary.balance}
          AccentIcon={Wallet}
          accent="text-blue-600"
        />
      </div>
    </div>
  );
}
