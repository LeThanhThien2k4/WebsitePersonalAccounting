import React from "react";
import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import PayrollTable from "../components/PayrollTable.jsx";
import PayrollPrint05, { export05ToPDF } from "../components/PayrollPDF.jsx";
import toast from "react-hot-toast";


export default function Payrolls() {
  const [periods, setPeriods] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [note, setNote] = useState("");
  const [current, setCurrent] = useState(null); // period detail
  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);

  const loadPeriods = async () => {
    const { data } = await api.get("/payrolls/periods");
    setPeriods(data);
  };
const createPeriod = async () => {
  setLoading(true);
  try {
    const { data } = await api.post("/payrolls/periods", { month, year, note });
    await loadPeriods();
    await openPeriod(data.id); // luôn mở kỳ mới hoặc cũ
  } finally {
    setLoading(false);
  }
};




  const openPeriod = async (id) => {
    const { data } = await api.get(`/payrolls/periods/${id}`);
    setCurrent(data);
  };

  const importEmployees = async () => {
    if (!current) return;
    setLoading(true);
    try {
      await api.post(`/payrolls/periods/${current.id}/import`, {});
      await openPeriod(current.id);
    } finally { setLoading(false); }
  };

  const calculate = async () => {
    if (!current) return;
    setLoading(true);
    try {
      await api.post(`/payrolls/periods/${current.id}/calc`, {
        workDaysInMonth: 26,
        otMultiplier: 1.5,
        roundTo: 1000,
      });
      await openPeriod(current.id);
    } finally { setLoading(false); }
  };

  const lockPeriod = async () => {
    if (!current) return;
    setLoading(true);
    try {
      await api.patch(`/payrolls/periods/${current.id}/lock`);
      await openPeriod(current.id);
    } finally { setLoading(false); }
  };
  const unlockPeriod = async () => {
  if (!current) return;
  setLoading(true);
  try {
    await api.patch(`/payrolls/periods/${current.id}/unlock`);
    await openPeriod(current.id);
    toast.success("Đã mở khóa kỳ để chỉnh sửa");
  } catch (err) {
    toast.error(err.response?.data?.error || "Lỗi mở khóa kỳ");
  } finally {
    setLoading(false);
  }
};


  const fetchPrintData = async () => {
    if (!current) return null;
    const { data } = await api.get(`/payrolls/periods/${current.id}/print-05`);
    return data;
  };

  const handlePrint = async () => {
    const payload = await fetchPrintData();
    if (!payload) return;
    await export05ToPDF(printRef, payload);
  };

  useEffect(() => { loadPeriods(); }, []);

  const statusBadge = (s) => (
    <span className={
      "px-2 py-0.5 rounded text-xs " +
      (s === "LOCKED" ? "bg-green-100 text-green-700"
       : s === "CALCULATED" ? "bg-yellow-100 text-yellow-700"
       : "bg-gray-100 text-gray-700")
    }>{s}</span>
  );

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Bảng lương (05-LĐTL)</h1>

      {/* Tạo kỳ */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div>
          <label className="text-sm">Tháng</label>
          <input type="number" className="input input-bordered w-full border rounded px-2 py-1"
                 value={month} onChange={e=>setMonth(+e.target.value)} min={1} max={12}/>
        </div>
        <div>
          <label className="text-sm">Năm</label>
          <input type="number" className="input input-bordered w-full border rounded px-2 py-1"
                 value={year} onChange={e=>setYear(+e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm">Ghi chú</label>
          <input className="input input-bordered w-full border rounded px-2 py-1"
                 value={note} onChange={e=>setNote(e.target.value)} />
        </div>
        <button onClick={createPeriod} disabled={loading}
                className="bg-black text-white px-3 py-2 rounded">
          Tạo kỳ
        </button>
      </div>

      {/* Danh sách kỳ */}
      <div className="border rounded">
        <div className="px-3 py-2 font-medium border-b">Kỳ đã tạo</div>
        <div className="max-h-56 overflow-auto divide-y">
          {periods.map(p=>(
            <div key={p.id} className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>{p.month}/{p.year}</div>
                {statusBadge(p.status)}
              </div>
              <button className="text-blue-600 underline" onClick={()=>openPeriod(p.id)}>Mở</button>
            </div>
          ))}
        </div>
      </div>

      {/* Chi tiết kỳ */}
      {current && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              Kỳ: {current.month}/{current.year} — {statusBadge(current.status)}
            </div>
            <div className="flex gap-2">
              <button onClick={importEmployees} disabled={loading || current.status!=="DRAFT"}
                      className="px-3 py-2 rounded border">Import NV</button>
              <button onClick={calculate} disabled={loading || current.status==="LOCKED"}
                      className="px-3 py-2 rounded border">Tính</button>
              {current.status === "LOCKED" ? (
  <button onClick={unlockPeriod} disabled={loading}
          className="px-3 py-2 rounded border text-red-600">
    Mở khóa kỳ
  </button>
) : (
  <button onClick={lockPeriod} disabled={loading || current.status!=="CALCULATED"}
          className="px-3 py-2 rounded border">
    Khóa kỳ
  </button>
)}

              <button onClick={handlePrint}
                      className="px-3 py-2 rounded bg-black text-white">Xuất PDF 05-LĐTL</button>
            </div>
          </div>

          <PayrollTable period={current} onChanged={()=>openPeriod(current.id)} />
          {/* Invisible print area (vẫn render, không chiếm chỗ) */}
<div className="absolute top-0 left-0 invisible">
  <PayrollPrint05 refObj={printRef} />
</div>
        </div>
      )}
    </div>
  );
}
