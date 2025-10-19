import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

/* ===== helpers ===== */
function moneyToWordsVn(n) {
  n = Math.round(Number(n || 0));
  if (n === 0) return "Tổng số tiền (viết bằng chữ): Không đồng";
  const d = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
  const s = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
  function read3(x) {
    const tr = Math.floor(x / 100), ch = Math.floor((x % 100) / 10), dv = x % 10;
    let t = "";
    if (tr > 0) { t += d[tr] + " trăm"; if (ch === 0 && dv > 0) t += " lẻ"; t += " "; }
    if (ch > 1) { t += d[ch] + " mươi"; if (dv === 1) t += " mốt"; else if (dv === 4) t += " tư"; else if (dv === 5) t += " lăm"; else if (dv > 0) t += " " + d[dv]; }
    else if (ch === 1) { t += "mười"; if (dv === 1) t += " một"; else if (dv === 4) t += " bốn"; else if (dv === 5) t += " lăm"; else if (dv > 0) t += " " + d[dv]; }
    else if (dv > 0) { t += d[dv]; }
    return t.trim();
  }
  let out = "", i = 0, num = n;
  while (num > 0 && i < s.length) {
    const block = num % 1000;
    if (block > 0) out = (read3(block) + s[i] + (out ? " " + out : "")).trim();
    num = Math.floor(num / 1000); i++;
  }
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return `Tổng số tiền (viết bằng chữ): ${out} đồng`;
}

/* ===== print layout ===== */
const PrintPreview = React.forwardRef(({ type, info, rows, total }, ref) => (
  <div ref={ref} className="bg-white p-6 text-[13px]" style={{ width: 794 }}>
    {/* tiêu đề hành chính */}
    <div className="flex justify-between mb-2">
      <div>
        <div><b>HỘ, CÁ NHÂN KINH DOANH:</b> {info.businessName || "........................................"}</div>
        <div><b>Địa chỉ:</b> {info.address || "...................................................."}</div>
      </div>
      <div className="text-right">
        <div><b>Mẫu số {type === "PNK" ? "03" : "04"} - VT</b></div>
        <div className="text-xs">(Ban hành kèm theo Thông tư số 88/2021/TT-BTC ngày 11/10/2021 của Bộ Tài chính)</div>
      </div>
    </div>

    {/* tiêu đề phiếu */}
    <div className="text-center mb-3">
      <div className="text-lg font-bold">{type === "PNK" ? "PHIẾU NHẬP KHO" : "PHIẾU XUẤT KHO"}</div>
      <div>Ngày …… tháng …… năm ……</div>
      <div>Số: {info.voucherNo || "........................"}</div>
    </div>

    {/* mô tả theo mẫu */}
    <div className="mb-3">
      {type === "PNK" ? (
        <>
          <div>- Họ và tên người giao hàng: {info.supplier || "..................................................."}</div>
          <div>- Theo ........ số ........ ngày ..... tháng ..... năm ..... của .....................................</div>
          <div>- Địa điểm nhập kho: {info.location || "...................................................."}</div>
        </>
      ) : (
        <>
          <div>- Họ và tên người nhận hàng: {info.receiver || "..................................................."}</div>
          <div>- Lý do xuất kho: {info.reason || "...................................................."}</div>
          <div>- Địa điểm xuất kho: {info.location || "...................................................."}</div>
        </>
      )}
    </div>

    {/* bảng A–D(1–4) */}
    <table className="w-full text-sm border" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr className="bg-gray-50">
          <th className="border p-2" rowSpan={2} style={{ width: 40 }}>STT</th>
          <th className="border p-2" rowSpan={2} style={{ width: 280 }}>A. Tên, nhãn hiệu, quy cách, phẩm chất vật liệu, dụng cụ, sản phẩm, hàng hóa</th>
          <th className="border p-2" rowSpan={2} style={{ width: 80 }}>B. Mã số</th>
          <th className="border p-2" rowSpan={2} style={{ width: 80 }}>C. Đơn vị tính</th>
          <th className="border p-2" colSpan={2} style={{ width: 160 }}>D. Số lượng</th>
          <th className="border p-2" rowSpan={2} style={{ width: 90 }}>3. Đơn giá</th>
          <th className="border p-2" rowSpan={2} style={{ width: 110 }}>4. Thành tiền</th>
        </tr>
        <tr className="bg-gray-50">
          <th className="border p-2" style={{ width: 80 }}>1. Theo chứng từ</th>
          <th className="border p-2" style={{ width: 80 }}>{type === "PNK" ? "2. Thực nhập" : "2. Thực xuất"}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="border p-2 text-center">{i + 1}</td>
            <td className="border p-2">{r.name || ""}</td>
            <td className="border p-2">{r.code || ""}</td>
            <td className="border p-2">{r.unit || ""}</td>
            <td className="border p-2 text-right">{r.qtyDocumented ?? ""}</td>
            <td className="border p-2 text-right">{r.qtyActual ?? ""}</td>
            <td className="border p-2 text-right">{Number(r.unitPrice || 0).toLocaleString()}</td>
            <td className="border p-2 text-right">{Number(r.amount || 0).toLocaleString()}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={7} className="border p-2 text-right font-semibold">Cộng</td>
          <td className="border p-2 text-right font-semibold">{Number(total || 0).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    {/* tổng tiền + chứng từ gốc */}
    <div className="mt-3">
      <div>- {moneyToWordsVn(total)}</div>
      <div>- Số chứng từ gốc kèm theo: {info.attachedDocs || "........................................"}</div>
    </div>

    {/* chữ ký */}
    <div className="mt-8 text-center">
      <div className="text-right mb-2">Ngày …… tháng …… năm ……</div>
      <div className="grid grid-cols-4 gap-4 text-center">
        {(type === "PNK"
          ? ["Người giao hàng", "Thủ kho", "Người lập biểu", "Người đại diện HKD/CNKD"]
          : ["Người nhận hàng", "Thủ kho", "Người lập biểu", "Người đại diện HKD/CNKD"]
        ).map((t, i) => (
          <div key={i}>
            <div className="font-semibold">{t}</div>
            <div className="text-xs italic">(Ký, họ tên)</div>
            <div className="mt-12 h-5"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

/* ===== main component ===== */
export default function VoucherMockupTT88({ defaultTab = "entry" }) {
  const { id } = useParams();              // /stock-in/:id hoặc /stock-out/:id
  const isEntry = defaultTab === "entry";  // entry = PNK, out = PXK

  const [info, setInfo] = useState({
    businessName: "",
    address: "",
    voucherNo: "",
    supplier: "",
    receiver: "",
    reason: "",
    location: "",
    attachedDocs: "",
  });
  const [rows, setRows] = useState([]);
  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);

  // tải dữ liệu thật
  useEffect(() => {
    if (!id) return;
    api.get(`/inventory/voucher/${id}`)
      .then(res => {
        setInfo(res.data.info || {});
        setRows(res.data.items || []);
      })
      .catch(err => console.error("Fetch voucher error:", err));
  }, [id]);

  // vùng chụp PDF
  const pdfRef = useRef(null);

  const exportPDF = async () => {
    const node = pdfRef.current;
    if (!node) return;

    // tránh lỗi oklch
    node.querySelectorAll("*").forEach((el) => {
      const cs = window.getComputedStyle(el);
      if (cs.color.includes("oklch")) el.style.color = "#000";
      if (cs.backgroundColor.includes("oklch")) el.style.backgroundColor = "#fff";
    });

    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const pdf = new jsPDF("p", "mm", "a4");
    const img = canvas.toDataURL("image/png");
    const pageW = 210;
    const imgH = (canvas.height * pageW) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, pageW, imgH, undefined, "FAST");
    pdf.save(`${info.voucherNo || (isEntry ? "PNK" : "PXK")}.pdf`);
  };

  /* giao diện thao tác cơ bản: chỉ nút xuất PDF, không hộp thoại in */
  return (
    <div className="max-w-6xl mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Tổng tiền: <b>{total.toLocaleString()}</b> đ
        </div>
        <button className="px-4 py-2 rounded-xl border hover:bg-gray-100" onClick={exportPDF}>
          Xuất PDF
        </button>
      </div>

      {/* khung chuẩn TT88 để chụp PDF (ẩn khỏi layout, nhưng vẫn render) */}
      <div style={{ position: "absolute", left: -10000, top: 0 }}>
        <PrintPreview
          ref={pdfRef}
          type={isEntry ? "PNK" : "PXK"}
          info={info}
          rows={rows}
          total={total}
        />
      </div>
    </div>
  );
}
