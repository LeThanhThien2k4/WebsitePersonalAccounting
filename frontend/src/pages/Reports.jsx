// frontend/src/pages/Reports.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { Chart } from "chart.js/auto";

function formatCurrency(v) {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN") + " đ";
}

function formatDateVN(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = String(vn.getDate()).padStart(2, "0");
  const month = String(vn.getMonth() + 1).padStart(2, "0");
  const year = vn.getFullYear();
  return `${day}/${month}/${year}`;
}

const currentYear = new Date().getFullYear();

export default function Reports() {
  const [month, setMonth] = useState("");
  const [quarter, setQuarter] = useState("");
  const [year, setYear] = useState(currentYear.toString());
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    revenue: 0,
    expense: 0,
    profit: 0,
    rows: [],
  });

  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/reports/summary", {
        params: {
          month: month || undefined,
          quarter: quarter || undefined,
          year,
        },
      });
      const data = res.data;
      setSummary({
        revenue: data.revenue || 0,
        expense: data.expense || 0,
        profit: data.profit || 0,
        rows: data.rows || [],
      });
      drawChart(data);
    } catch (err) {
      console.error("❌ Lỗi báo cáo tổng hợp:", err);
      alert("Không thể tải báo cáo tổng hợp");
    } finally {
      setLoading(false);
    }
  };

  const drawChart = (data) => {
    if (!canvasRef.current) return;

    // Destroy chart cũ nếu có để tránh lỗi "Canvas is already in use"
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const revenue = Number(data.revenue || 0);
    const expense = Number(data.expense || 0); // âm
    const profit = Number(data.profit || 0); // có thể âm

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Doanh thu", "Chi phí", "Lợi nhuận"],
        datasets: [
          {
            label: "Giá trị (VND)",
            data: [revenue, expense, profit],
            backgroundColor: ["green", "red", "blue"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    loadData();
  };

  // Export PDF theo từng dòng dựa vào reportCode (S1–S5)
  const handleExportRow = async (row) => {
    const map = {
      S1: "/reports/s1/pdf",
      S2: "/reports/s2/pdf", // nếu sau này có S2
      S3: "/reports/s3/pdf",
      S4: "/reports/s4/pdf",
      S5: "/reports/s5/pdf",
    };

    const endpoint = map[row.reportCode];
    if (!endpoint) {
      alert("Dòng này chưa mapping mẫu sổ (S1–S5)");
      return;
    }

    try {
      const res = await api.get(endpoint, {
        params: {
          month: month || undefined,
          quarter: quarter || undefined,
          year,
        },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.reportCode || "SO"}_${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Lỗi xuất PDF:", err);
      alert("Không thể xuất PDF cho dòng này");
    }
  };

  // Xóa dòng (hiện tại chưa xử lý backend – chỉ demo)
  const handleDeleteRow = (row) => {
    console.log("Delete row chưa implement:", row);
    alert("Chức năng xóa báo cáo tổng hợp chưa được triển khai.");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span role="img" aria-label="chart">
            📊
          </span>
          Báo cáo tổng hợp (S1 – S5)
        </h2>
      </div>

      {/* Bộ lọc */}
      <form
        onSubmit={handleFilter}
        className="flex flex-wrap gap-3 items-center"
      >
        <select
          className="border rounded px-3 py-2"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="">Tháng</option>
          {Array.from({ length: 12 }).map((_, idx) => (
            <option key={idx + 1} value={idx + 1}>
              Tháng {idx + 1}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2"
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
        >
          <option value="">Quý</option>
          <option value="1">Quý 1</option>
          <option value="2">Quý 2</option>
          <option value="3">Quý 3</option>
          <option value="4">Quý 4</option>
        </select>

        <input
          type="number"
          className="border rounded px-3 py-2 w-24"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Lọc dữ liệu"}
        </button>
      </form>

      {/* Biểu đồ */}
      <div className="border rounded-lg p-4 bg-white" style={{ height: 340 }}>
        <canvas id="reportChart" ref={canvasRef} />
      </div>

      {/* Bảng chi tiết */}
      <div className="border rounded-lg overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 w-28">Ngày</th>
              <th className="border px-3 py-2 w-32">Loại</th>
              <th className="border px-3 py-2">Lý do</th>
              <th className="border px-3 py-2 w-40">Số tiền</th>
              <th className="border px-3 py-2 w-40">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  Không có dữ liệu trong kỳ đã chọn
                </td>
              </tr>
            ) : (
              summary.rows.map((row, idx) => {
                const amount = Number(row.amount || 0);
                const color =
                  amount > 0
                    ? "text-green-600"
                    : amount < 0
                    ? "text-red-600"
                    : "";

                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-3 py-2 text-center">
                      {row.dateVN || formatDateVN(row.date)}
                    </td>
                    <td className="border px-3 py-2">{row.type}</td>
                    <td className="border px-3 py-2">{row.reason}</td>
                    <td className={`border px-3 py-2 text-right ${color}`}>
                      {formatCurrency(amount)}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExportRow(row)}
                          className="bg-gray-800 text-white text-xs px-3 py-1 rounded hover:bg-black"
                        >
                          PDF {row.reportCode || ""}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row)}
                          className="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
