import React, { forwardRef } from "react";

/* --- Hàm đổi số thành chữ --- */
function moneyToWordsVn(n) {
  n = Math.round(Number(n || 0));
  if (n === 0) return "Không đồng";
  const d = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
  const s = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ"];
  function read3(x) {
    const tr = Math.floor(x / 100), ch = Math.floor((x % 100) / 10), dv = x % 10;
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
    n = Math.floor(n / 1000); i++;
  }
  return res.charAt(0).toUpperCase() + res.slice(1) + " đồng";
}

/* --- Component PDF Phiếu Chi chuẩn TT88 --- */
const PaymentPDF = forwardRef(({ info }, ref) => {
  return (
    <div
      ref={ref}
      className="bg-white text-[13px] text-black p-8"
      style={{ width: 794, lineHeight: 1.6, fontFamily: "Times New Roman" }}
    >
      <div className="flex justify-between mb-2">
        <div>
          <div><b>HỘ, CÁ NHÂN KINH DOANH:</b> {info.businessName || "..................."}</div>
          <div><b>Địa chỉ:</b> {info.address || "..........................................."}</div>
        </div>
        <div className="text-right">
          <b>Mẫu số 02 – TT</b>
          <div className="text-[11px] leading-tight">
            (Ban hành kèm theo Thông tư số 88/2021/TT-BTC<br />
            ngày 11 tháng 10 năm 2021 của Bộ Tài chính)
          </div>
        </div>
      </div>

      <div className="text-center font-bold text-[16px] mt-4 mb-2">PHIẾU CHI</div>
      <div className="flex justify-between mb-2">
        <div>Ngày ...... tháng ...... năm ......</div>
        <div>Quyển số: ............ &nbsp;&nbsp; Số: ....................</div>
      </div>

      <div className="mb-1">Họ và tên người nhận tiền: {info.payee || ".................................................."}</div>
      <div className="mb-1">Địa chỉ: {info.addressPayee || ".................................................."}</div>
      <div className="mb-1">Lý do chi: {info.reason || ".................................................."}</div>
      <div className="mb-1">Số tiền: {Number(info.amount || 0).toLocaleString("vi-VN")} đồng</div>
      <div className="mb-1">(Viết bằng chữ): {moneyToWordsVn(info.amount)}</div>
      <div className="mb-1">Kèm theo: {info.attach || ".................................................."} &nbsp;&nbsp; Chứng từ gốc: ...........</div>

      <div className="text-right mt-8 mb-6">Ngày ..... tháng ..... năm .....</div>

      <div className="grid grid-cols-4 text-center gap-2">
        <div>
          <b>NGƯỜI ĐẠI DIỆN<br />HỘ KINH DOANH/<br />CÁ NHÂN KINH DOANH</b>
          <div className="italic text-[12px]">(Ký, họ tên, đóng dấu)</div>
          <div className="h-16" />
        </div>
        <div>
          <b>NGƯỜI LẬP BIỂU</b>
          <div className="italic text-[12px]">(Ký, họ tên)</div>
          <div className="h-16" />
        </div>
        <div>
          <b>NGƯỜI NHẬN TIỀN</b>
          <div className="italic text-[12px]">(Ký, họ tên)</div>
          <div className="h-16" />
        </div>
        <div>
          <b>THỦ QUỸ</b>
          <div className="italic text-[12px]">(Ký, họ tên)</div>
          <div className="h-16" />
        </div>
      </div>

      <div className="mt-8">
        <b>Đã nhận đủ số tiền (viết bằng chữ):</b> {moneyToWordsVn(info.amount)}
      </div>
    </div>
  );
});

export default PaymentPDF;
