import React, { forwardRef } from "react";

/* -------- Hàm đổi số thành chữ -------- */
function moneyToWordsVn(n) {
  n = Math.round(Number(n || 0));
  if (n === 0) return "Không đồng";
  const d = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const s = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ"];
  function read3(x) {
    const tr = Math.floor(x / 100),
      ch = Math.floor((x % 100) / 10),
      dv = x % 10;
    let t = "";
    if (tr > 0) t += d[tr] + " trăm" + (ch === 0 && dv > 0 ? " lẻ" : "");
    if (ch > 1)
      t += " " + d[ch] + " mươi" + (dv === 1 ? " mốt" : dv === 5 ? " lăm" : dv > 0 ? " " + d[dv] : "");
    else if (ch === 1)
      t += " mười" + (dv === 5 ? " lăm" : dv > 0 ? " " + d[dv] : "");
    else if (ch === 0 && dv > 0) t += " " + d[dv];
    return t.trim();
  }
  let res = "", i = 0;
  while (n > 0) {
    const block = n % 1000;
    if (block > 0) res = read3(block) + s[i] + (res ? " " + res : "");
    n = Math.floor(n / 1000);
    i++;
  }
  return res.charAt(0).toUpperCase() + res.slice(1) + " đồng";
}

/* -------- Ledger PDF Component -------- */
const LedgerPDF = forwardRef(({ info, rows = [] }, ref) => {
  const totalIn = rows.filter(r => r.signedAmount > 0).reduce((s, r) => s + r.signedAmount, 0);
  const totalOut = rows.filter(r => r.signedAmount < 0).reduce((s, r) => s + Math.abs(r.signedAmount), 0);
  const balance = totalIn - totalOut;

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "Times New Roman, serif",
        color: "black",
        fontSize: "13px",
        background: "white",
        padding: "32px",
        width: "794px",
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <div>
          <b>HỘ KINH DOANH:</b> {info.businessName || "................................................"} <br />
          <b>Địa chỉ:</b> {info.address || "................................................"}
        </div>
        <div style={{ textAlign: "right" }}>
          <b>{info.type === "S6" ? "Mẫu số S6 – HKD" : "Mẫu số S7 – HKD"}</b>
          <div style={{ fontSize: "11px", lineHeight: "14px" }}>
            (Ban hành kèm theo Thông tư số 88/2021/TT-BTC<br />
            ngày 11 tháng 10 năm 2021 của Bộ Tài chính)
          </div>
        </div>
      </div>

      {/* Title */}
      <h2 style={{ textAlign: "center", fontSize: "16px", fontWeight: "bold", margin: "12px 0 4px" }}>
        {info.type === "S6" ? "SỔ QUỸ TIỀN MẶT (S6-HKD)" : "SỔ TIỀN GỬI NGÂN HÀNG (S7-HKD)"}
      </h2>
      <div style={{ textAlign: "center", fontStyle: "italic", fontSize: "12px", marginBottom: "8px" }}>
        Theo Thông tư 88/2021/TT-BTC
      </div>

      {/* Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid black",
          marginTop: "8px",
        }}
      >
        <thead>
          <tr style={{ background: "#f3f3f3", textAlign: "center", fontWeight: "bold" }}>
            <th style={{ border: "1px solid black", padding: "4px", width: "40px" }}>STT</th>
            <th style={{ border: "1px solid black", padding: "4px", width: "80px" }}>Ngày</th>
            <th style={{ border: "1px solid black", padding: "4px", width: "60px" }}>Loại</th>
            <th style={{ border: "1px solid black", padding: "4px" }}>Nội dung</th>
            <th style={{ border: "1px solid black", padding: "4px", width: "120px" }}>Số tiền (VNĐ)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "8px", border: "1px solid black" }}>
                Không có dữ liệu trong kỳ
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.id || i}>
                <td style={{ border: "1px solid black", textAlign: "center", padding: "4px" }}>{i + 1}</td>
                <td style={{ border: "1px solid black", textAlign: "center", padding: "4px" }}>
                  {new Date(r.date).toLocaleDateString("vi-VN")}
                </td>
                <td style={{ border: "1px solid black", textAlign: "center", padding: "4px" }}>{r.type}</td>
                <td style={{ border: "1px solid black", padding: "4px" }}>{r.reason}</td>
                <td
                  style={{
                    border: "1px solid black",
                    textAlign: "right",
                    padding: "4px",
                    color: r.signedAmount >= 0 ? "green" : "red",
                  }}
                >
                  {r.signedAmount.toLocaleString("vi-VN")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ marginTop: "12px", textAlign: "right" }}>
        <div>🔹 <b>Tổng thu:</b> {totalIn.toLocaleString("vi-VN")} đ</div>
        <div>🔸 <b>Tổng chi:</b> {totalOut.toLocaleString("vi-VN")} đ</div>
        <div style={{ fontWeight: "bold" }}>💰 Tồn cuối kỳ: {balance.toLocaleString("vi-VN")} đ</div>
      </div>

      {/* Signatures */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          textAlign: "center",
          marginTop: "40px",
          fontSize: "13px",
        }}
      >
        <div style={{ width: "33%" }}>
          <b>NGƯỜI LẬP SỔ</b>
          <div style={{ fontStyle: "italic" }}>(Ký, họ tên)</div>
          <div style={{ height: "60px" }} />
        </div>
        <div style={{ width: "33%" }}>
          <b>CHỦ HỘ</b>
          <div style={{ fontStyle: "italic" }}>(Ký, họ tên)</div>
          <div style={{ height: "60px" }} />
        </div>
        <div style={{ width: "33%" }}>
          <b>KẾ TOÁN TRƯỞNG</b>
          <div style={{ fontStyle: "italic" }}>(Ký, họ tên)</div>
          <div style={{ height: "60px" }} />
        </div>
      </div>
    </div>
  );
});

export default LedgerPDF;
