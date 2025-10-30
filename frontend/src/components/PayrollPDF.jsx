import React from "react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

export default function PayrollPrint05({ refObj }) {
  return (
    <div ref={refObj} className="w-[1123px] bg-white text-black p-6"></div>
  );
}

const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");

/* ================== EXPORT PDF ================== */
export async function export05ToPDF(refObj, payload) {
  const temp = document.createElement("div");
  temp.style.position = "absolute";
  temp.style.left = "-9999px";
  temp.style.width = "1123px";
  temp.style.background = "#fff";
  temp.innerHTML = renderHTML(payload);
  document.body.appendChild(temp);

  await new Promise((r) => setTimeout(r, 300));

  const canvas = await html2canvas(temp, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: 0,
    windowWidth: temp.scrollWidth,
  });

  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
  const imgW = canvas.width * ratio;
  const imgH = canvas.height * ratio;
  const x = (pageW - imgW) / 2 || 0;
  const y = (pageH - imgH) / 2 || 0;

  pdf.addImage(img, "PNG", x, y, imgW, imgH);
  pdf.save(`05-LDTL_${payload.period.month}-${payload.period.year}.pdf`);
  document.body.removeChild(temp);
}

/* ================== HTML TEMPLATE ================== */
function renderHTML(d) {
  const trs = d.rows
    .map(
      (r) => `
    <tr>
      <td>${r.stt}</td>
      <td>${escape(r.employeeName)}</td>
      <td>${escape(r.position || "")}</td>
      <td>${fmt(r.salaryBase)}</td>
      <td>${fmt(r.daysWorked)}</td>
      <td>${fmt(r.otHours)}</td>
      <td>${fmt(r.allowances)}</td>
      <td>${fmt(r.bonus)}</td>
      <td>${fmt(r.otherIncome)}</td>
      <td>${fmt(r.deductUnpaid)}</td>
      <td>${fmt(r.advance)}</td>
      <td>${fmt(r.bhxhEmp)}</td>
      <td>${fmt(r.bhytEmp)}</td>
      <td>${fmt(r.bhtnEmp)}</td>
      <td>${fmt(r.unionEmp)}</td>
      <td>${fmt(r.gross)}</td>
      <td>${fmt(r.netPay)}</td>
      <td></td>
    </tr>`
    )
    .join("");

  const totals = `
    <tr style="font-weight:600; background:#f9f9f9;">
      <td colspan="15" style="text-align:right; border:1px solid #000;">Cộng</td>
      <td style="border:1px solid #000; text-align:right;">${fmt(d.totals.gross)}</td>
      <td style="border:1px solid #000; text-align:right;">${fmt(d.totals.netPay)}</td>
      <td style="border:1px solid #000;"></td>
    </tr>`;

  return `
  <div style="font-family:'Times New Roman', serif; font-size:12px; color:#000; width:1123px; padding:24px;">
  <style>
  table, th, td {
    border: 1px solid #000;
    border-collapse: collapse;
  }
  th, td {
    padding: 4px;
    line-height: 1.4;
  }
  thead tr {
    background: #f5f5f5;
  }
</style>

    <div style="text-align:right; font-size:13px;">
      <b>Mẫu số: 05-LĐTL</b><br/>
      <i>(Ban hành kèm theo Thông tư số 88/2021/TT-BTC ngày 11 tháng 10 năm 2021 của Bộ trưởng Bộ Tài chính)</i>
    </div>

    <div style="margin-top:6px; line-height:1.4;">
      <b>HỘ, CÁ NHÂN KINH DOANH:</b> ${escape(d.business.name || "................................")}<br/>
      Địa chỉ: ${escape(d.business.address || "............................................................")}
    </div>

    <h2 style="text-align:center; font-weight:700; margin:14px 0 6px;">
      BẢNG THANH TOÁN TIỀN LƯƠNG VÀ CÁC KHOẢN THU NHẬP CỦA NGƯỜI LAO ĐỘNG
    </h2>
    <div style="text-align:center; margin-bottom:10px;">Tháng ${d.period.month} năm ${d.period.year}</div>

    <table style="
  border-collapse:collapse;
  table-layout:fixed;
  width:100%;
  border:2px solid #000;
  font-size:11px;
  text-align:center;
">

      <thead>
        <tr style="background:#f2f2f2;">
          <th style="width:3%; border:1px solid #000;">STT</th>
          <th style="width:12%; border:1px solid #000;">Họ và tên</th>
          <th style="width:10%; border:1px solid #000;">Chức vụ</th>
          <th style="width:7%; border:1px solid #000;">Lương SP</th>
          <th style="width:6%; border:1px solid #000;">Ngày công</th>
          <th style="width:6%; border:1px solid #000;">Giờ OT</th>
          <th style="width:7%; border:1px solid #000;">Phụ cấp</th>
          <th style="width:6%; border:1px solid #000;">Thưởng</th>
          <th style="width:6%; border:1px solid #000;">Khác</th>
          <th style="width:6%; border:1px solid #000;">Khấu trừ KL</th>
          <th style="width:6%; border:1px solid #000;">Tạm ứng</th>
          <th style="width:5%; border:1px solid #000;">BHXH</th>
          <th style="width:5%; border:1px solid #000;">BHYT</th>
          <th style="width:5%; border:1px solid #000;">BHTN</th>
          <th style="width:5%; border:1px solid #000;">CĐ phí</th>
          <th style="width:7%; border:1px solid #000;">Tổng TN</th>
          <th style="width:7%; border:1px solid #000;">Thực lĩnh</th>
          <th style="width:6%; border:1px solid #000;">Ký nhận</th>
        </tr>
      </thead>
      <tbody>${trs}${totals}</tbody>
    </table>

    <div style="margin-top:10px;">Tổng số tiền (viết bằng chữ): ....................................................................................................</div>

    <div style="display:flex; justify-content:space-between; margin-top:36px; text-align:center; font-size:12px;">
      <div style="flex:1;">
        <b>NGƯỜI LẬP BIỂU</b><br/><i>(Ký, họ tên)</i>
      </div>
      <div style="flex:1;">
        <b>NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/CÁ NHÂN KINH DOANH</b><br/><i>(Ký, họ tên, đóng dấu)</i>
      </div>
    </div>
  </div>`;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  );
}
  