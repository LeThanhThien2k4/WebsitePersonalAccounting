import React, { useEffect, useState } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { toast } from "react-hot-toast";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Activity,
  Users,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const API = "http://localhost:4000/api";

function api(url) {
  const token = localStorage.getItem("token");
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

function formatMoney(v) {
  return (v || 0).toLocaleString("vi-VN") + " đ";
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [expensePie, setExpensePie] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🟦 Ghi chú (lưu localStorage)
  const [note, setNote] = useState(() => {
    return localStorage.getItem("dashboard_note") || "";
  });

  useEffect(() => {
    localStorage.setItem("dashboard_note", note);
  }, [note]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.toISOString().slice(0, 7);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const [s, c, e, r] = await Promise.all([
        api(`${API}/reports/dashboard`),
        api(`${API}/reports/cashflow?year=${year}`),
        api(`${API}/reports/expense-breakdown?month=${month}`),
        api(`${API}/reports/recent-transactions?limit=8`),
      ]);

      if (!s.ok) throw new Error("Dashboard API lỗi");
      if (!c.ok) throw new Error("Cashflow API lỗi");
      if (!e.ok) throw new Error("Expense Breakdown API lỗi");
      if (!r.ok) throw new Error("Recent Transactions API lỗi");

      setSummary(await s.json());
      setCashflow(await c.json());
      setExpensePie(await e.json());
      setRecent(await r.json());
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải Dashboard");
    } finally {
      setLoading(false);
    }
  }

  const lineChart =
    cashflow?.months
      ? {
          labels: cashflow.months,
          datasets: [
            {
              label: "Doanh thu",
              data: cashflow.revenue,
              borderColor: "#22c55e",
              backgroundColor: "#22c55e40",
              borderWidth: 2,
              tension: 0.3,
            },
            {
              label: "Chi phí",
              data: cashflow.expense,
              borderColor: "#ef4444",
              backgroundColor: "#ef444440",
              borderWidth: 2,
              tension: 0.3,
            },
          ],
        }
      : null;

  const pieChart =
    expensePie?.length
      ? {
          labels: expensePie.map((i) => i.label),
          datasets: [
            {
              data: expensePie.map((i) => i.value),
              backgroundColor: ["#60a5fa", "#f87171", "#fb923c"],
            },
          ],
        }
      : null;

  if (loading) return <div className="p-6 text-gray-500">Đang tải...</div>;

  if (!summary)
    return (
      <div className="p-6 text-red-600">
        Không tải được dữ liệu Dashboard — hãy kiểm tra backend (port 4000)
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan kế toán Hộ Kinh Doanh</h1>
      
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          title="Doanh thu tháng "
          value={formatMoney(summary.revenueMonth)}
          icon={<TrendingUp size={20} />}
          color="emerald"
          desc="Tổng thu trong tháng"
        />
        <Card
          title="Chi phí tháng "
          value={formatMoney(summary.expenseMonth)}
          icon={<TrendingDown size={20} />}
          color="red"
          desc="Tổng chi trong tháng"
        />
        <Card
          title="Lợi nhuận ròng"
          value={formatMoney(summary.profitMonth)}
          icon={<Activity size={20} />}
          color="indigo"
          desc="Doanh thu – Chi phí"
        />
        <Card
          title="Tồn quỹ hiện tại"
          value={formatMoney(summary.cashBalance)}
          icon={<Wallet size={20} />}
          color="sky"
          desc="Dòng tiền còn lại"
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line chart */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow border">
          <h2 className="font-semibold mb-2">Dòng tiền 12 tháng</h2>
          {lineChart ? <Line data={lineChart} /> : "Chưa có dữ liệu"}
        </div>

        {/* Pie chart */}
        <div className="bg-white p-4 rounded-xl shadow border">
          <h2 className="font-semibold mb-2">Cơ cấu chi phí</h2>
          {pieChart ? <Doughnut data={pieChart} /> : "Không có dữ liệu"}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <InfoCard
              label="Lương phải trả"
              value={formatMoney(summary.pendingPayroll)}
              icon={<PiggyBank size={18} />}
            />
            <InfoCard
              label="Giá trị tồn kho"
              value={formatMoney(summary.inventoryValue)}
              icon={<Package size={18} />}
            />
            <InfoCard
              label="Chi hôm nay"
              value={formatMoney(summary.todayExpense)}
              icon={<ArrowDownCircle size={18} />}
            />
            <InfoCard
              label="Thu hôm nay"
              value={formatMoney(summary.todayIncome)}
              icon={<ArrowUpCircle size={18} />}
            />
          </div>
        </div>
      </div>

      {/* RECENT + EMPLOYEES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent transactions */}
        <div className="bg-white p-4 rounded-xl shadow border">
          <h2 className="font-semibold mb-2">Giao dịch gần nhất</h2>

          {!recent.length && (
            <p className="text-gray-400 text-sm">Chưa có giao dịch</p>
          )}

          <div className="divide-y">
            {recent.map((t) => (
              <div key={t.id} className="py-2 flex justify-between">
                <div>
                  <p className="font-medium">{t.description}</p>
                  <p className="text-xs text-gray-500">
                    {t.date} • TK {t.account}
                  </p>
                </div>

                <div
                  className={`font-semibold ${
                    t.type === "THU" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {t.type === "THU" ? "+" : "-"}
                  {t.amount.toLocaleString("vi-VN")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee summary */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Users size={18} /> Nhân sự & hoạt động
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="text-xs text-slate-400">Số nhân viên</p>
              <p className="font-semibold text-lg">
                {summary.employeesCount} người
              </p>
            </div>

            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="text-xs text-slate-400">Lương tháng</p>
              <p className="font-semibold text-lg">
                {formatMoney(summary.pendingPayroll)}
              </p>
            </div>

            {/* Ghi chú */}
            <div className="bg-slate-800 p-3 rounded-lg col-span-2">
              <p className="text-xs text-slate-400 mb-1">Ghi chú</p>

              <textarea
                className="w-full bg-slate-700 text-white p-2 rounded outline-none text-sm resize-none"
                rows={3}
                placeholder="Nhập ghi chú tại đây..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* COMPONENTS */

function Card({ title, value, icon, desc, color }) {
  const colorMap = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red: "bg-red-50 border-red-200 text-red-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    sky: "bg-sky-50 border-sky-200 text-sky-700",
  };

  return (
    <div className={`rounded-xl border p-4 shadow ${colorMap[color]}`}>
      <div className="flex justify-between items-center">
        <p className="font-semibold">{title}</p>
        <div className="p-2 bg-white rounded-full shadow">{icon}</div>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{desc}</p>
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="border rounded-xl p-3 bg-white flex items-center gap-3 shadow-sm">
      <div className="p-2 bg-gray-100 rounded-full">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
