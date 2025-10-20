import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

/* ---------- Chuyển số thành chữ ---------- */
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

/* ---------- Bảng hàng hóa ---------- */
function LineItemsTable({ rows, setRows, editable = true, isEntry }) {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    api.get("/inventory/items").then(res => setInventory(res.data));
  }, []);

  const update = (idx, key, val) => {
    const clone = [...rows];
    clone[idx] = { ...clone[idx], [key]: val };
    clone[idx].amount =
      Number(clone[idx].qtyActual || 0) * Number(clone[idx].unitPrice || 0);
    setRows(clone);
  };

  const selectItem = (idx, id) => {
    const item = inventory.find(i => i.id === Number(id));
    if (!item) return;
    const clone = [...rows];
    clone[idx] = {
      ...clone[idx],
      itemId: item.id,
      name: item.name,
      code: item.code,
      unit: item.unit,
      unitPrice: item.unitPriceIn || 0,
    };
    setRows(clone);
  };

  const addRow = () =>
    setRows([
      ...rows,
      { itemId: null, name: "", code: "", unit: "", qtyDocumented: "", qtyActual: "", unitPrice: "", amount: 0 },
    ]);

  const removeRow = (idx) => {
    const clone = [...rows];
    clone.splice(idx, 1);
    setRows(clone);
  };

  return (
    <div className="overflow-auto">
      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border p-2">STT</th>
            <th className="border p-2">Tên hàng (chọn từ kho)</th>
            <th className="border p-2">Mã</th>
            <th className="border p-2">ĐVT</th>
            <th className="border p-2">Theo chứng từ</th>
            <th className="border p-2">{isEntry ? "Thực nhập" : "Thực xuất"}</th>
            <th className="border p-2">Đơn giá</th>
            <th className="border p-2">Thành tiền</th>
            {editable && <th className="border p-2">Xóa</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border text-center">{i + 1}</td>
              <td className="border p-1">
                <select
                  value={r.itemId || ""}
                  onChange={(e) => selectItem(i, e.target.value)}
                  className="border w-full p-1"
                >
                  <option value="">-- Chọn hàng hóa --</option>
                  {inventory.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border text-center">{r.code}</td>
              <td className="border text-center">{r.unit}</td>
              <td className="border text-right">
                <input
                  value={r.qtyDocumented}
                  onChange={(e) => update(i, "qtyDocumented", e.target.value)}
                  className="w-full border p-1"
                />
              </td>
              <td className="border text-right">
                <input
                  value={r.qtyActual}
                  onChange={(e) => update(i, "qtyActual", e.target.value)}
                  className="w-full border p-1"
                />
              </td>
              <td className="border text-right">
                <input
                  value={r.unitPrice}
                  onChange={(e) => update(i, "unitPrice", e.target.value)}
                  className="w-full border p-1"
                />
              </td>
              <td className="border text-right">
                {Number(r.amount || 0).toLocaleString()}
              </td>
              {editable && (
                <td className="border text-center">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-red-600 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editable && (
        <button
          onClick={addRow}
          className="mt-2 px-3 py-1 border rounded hover:bg-gray-100"
        >
          + Thêm dòng
        </button>
      )}
    </div>
  );
}


/* ---------- Mẫu in PDF theo TT 88/2021 (chuẩn 03-VT) ---------- */
const PrintPreview = React.forwardRef(function PrintPreview(
  { info, rows, total, type },
  ref
) {
  const isPNK = type === "PNK";
  return (
    <div ref={ref} className="bg-white p-6 text-[13px]" style={{ width: 794 }}>
      <style>{`
        .tt-table{border-collapse:collapse;width:100%;font-size:13px}
        .tt-table th,.tt-table td{border:1px solid #000;padding:6px}
        .tt-th{font-weight:600;text-align:center;vertical-align:middle}
        .tt-sub td{border-left:1px solid #000;border-right:1px solid #000;text-align:center}
        .tt-x td{height:28px;text-align:center}
      `}</style>

      {/* Header trái/phải */}
      <div className="flex justify-between mb-2">
        <div>
          <div>
            <b>HỘ, CÁ NHÂN KINH DOANH:</b>{" "}
            {info.businessName || "........................................"}
          </div>
          <div>
            <b>Địa chỉ:</b>{" "}
            {info.address || "...................................................."}
          </div>
        </div>
        <div className="text-right">
          <div><b>Mẫu số {isPNK ? "03" : "04"} - VT</b></div>
          <div className="text-xs">
            (Ban hành kèm theo Thông tư số 88/2021/TT-BTC ngày 11 tháng 10 năm 2021 của Bộ Tài chính)
          </div>
        </div>
      </div>

      {/* Tiêu đề phiếu */}
      <div className="text-center mb-3">
        <div className="text-lg font-bold">
          {isPNK ? "PHIẾU NHẬP KHO" : "PHIẾU XUẤT KHO"}
        </div>
        <div>Ngày...tháng....năm ......</div>
        <div>Số: {info.voucherNo || "........................"}</div>
      </div>

      {/* Dòng thông tin theo mẫu */}
      <div className="mb-3">
        {isPNK ? (
          <>
            <div>
              - Họ và tên người giao hàng:{" "}
              {info.supplier || ".............................................................."}
            </div>
            <div>
              - Theo .......... số .......... ngày ..... tháng ..... năm ..... của .....................
            </div>
            <div>
              Địa điểm nhập kho:{" "}
              {info.location || ".............................................................."}
            </div>
          </>
        ) : (
          <>
            <div>
              - Họ và tên người nhận hàng:{" "}
              {info.receiver || ".............................................................."}
            </div>
            <div>
              - Lý do xuất kho:{" "}
              {info.reason || ".............................................................."}
            </div>
            <div>
              Địa điểm xuất kho:{" "}
              {info.location || ".............................................................."}
            </div>
          </>
        )}
      </div>

      {/* Bảng theo đúng bố cục TT88 */}
      <table className="tt-table">
        <thead>
          <tr>
            <th className="tt-th" rowSpan={2} style={{width:50}}>STT</th>
            <th className="tt-th" rowSpan={2}>
              Tên, nhãn hiệu, quy cách, phẩm chất vật liệu, dụng cụ, sản phẩm, hàng hóa
            </th>
            <th className="tt-th" rowSpan={2} style={{width:80}}>Mã số</th>
            <th className="tt-th" rowSpan={2} style={{width:90}}>Đơn vị tính</th>
            <th className="tt-th" colSpan={2} style={{width:180}}>Số lượng</th>
            <th className="tt-th" rowSpan={2} style={{width:110}}>Đơn giá</th>
            <th className="tt-th" rowSpan={2} style={{width:120}}>Thành tiền</th>
          </tr>
          <tr>
            <th className="tt-th">Theo chứng từ</th>
            <th className="tt-th">{isPNK ? "Thực nhập" : "Thực xuất"}</th>
          </tr>
          {/* Hàng A–D và 1–4 */}
          <tr className="tt-sub">
            <td className="tt-th">A</td>
            <td className="tt-th">B</td>
            <td className="tt-th">C</td>
            <td className="tt-th">D</td>
            <td className="tt-th">1</td>
            <td className="tt-th">2</td>
            <td className="tt-th">3</td>
            <td className="tt-th">4</td>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="text-center">{i + 1}</td>
              <td>{r.name || ""}</td>
              <td className="text-center">{r.code || ""}</td>
              <td className="text-center">{r.unit || ""}</td>
              <td className="text-right">{r.qtyDocumented || ""}</td>
              <td className="text-right">{r.qtyActual || ""}</td>
              <td className="text-right">{Number(r.unitPrice || 0).toLocaleString()}</td>
              <td className="text-right">{Number(r.amount || 0).toLocaleString()}</td>
            </tr>
          ))}

          {/* Cộng */}
          <tr>
            <td colSpan={7} className="text-right font-semibold">Cộng</td>
            <td className="text-right font-semibold">
              {Number(total || 0).toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Dòng dưới bảng */}
      <div className="mt-3">
        <div>- Tổng số tiền (viết bằng chữ): {moneyToWordsVn(total).replace("Tổng số tiền (viết bằng chữ): ", "")}</div>
        <div>
          - Số chứng từ gốc kèm theo:{" "}
          {info.attachedDocs || ".............................................................."}
        </div>
      </div>

      {/* Chữ ký */}
      <div className="mt-8">
        <div className="text-right mb-2">Ngày ... tháng ... năm ......</div>
        <div className="grid grid-cols-4 text-center gap-4">
          {(isPNK
            ? ["NGƯỜI GIAO HÀNG", "THỦ KHO", "NGƯỜI LẬP BIỂU", "NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/ CÁ NHÂN KINH DOANH"]
            : ["NGƯỜI NHẬN HÀNG", "THỦ KHO", "NGƯỜI LẬP BIỂU", "NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/ CÁ NHÂN KINH DOANH"]
          ).map((t) => (
            <div key={t}>
              <div className="font-semibold">{t}</div>
              <div className="italic text-xs">(Ký, họ tên)</div>
              <div className="mt-12 h-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});


/* ---------- Component chính ---------- */
export default function VoucherMockupTT88({ type: initialType = "PNK" }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [type, setType] = useState(initialType);
  const [touched, setTouched] = useState({});
  const [info, setInfo] = useState({
    businessName: "",
    address: "",
    voucherNo: "",
    supplier: "",
    receiver: "",
    reason: "",
    location: "",
  });
  const [rows, setRows] = useState([
    { itemId: null, name: "", code: "", unit: "", qtyDocumented: "", qtyActual: "", unitPrice: "", amount: 0 },
  ]);
  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
  const pdfRef = useRef(null);

  const required = (field) =>
    touched[field] && !info[field]?.trim() ? "border-red-500" : "border-gray-300";
  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const isValid =
    info.businessName.trim() && info.address.trim() && info.location.trim() &&
    rows.length > 0 && total > 0 &&
    !rows.some(r => !r.itemId || Number(r.qtyActual) <= 0);

  const saveVoucher = async () => {
    setTouched({ businessName: true, address: true, location: true });
    if (!isValid) return toast.error("Vui lòng nhập đủ thông tin bắt buộc");

    try {
      const payload = { ...info, type, items: rows, totalAmount: total };
      const res = await api.post("/inventory/voucher", payload);
      toast.success("✅ Lưu phiếu thành công!");
      if (res.data?.id) nav(`/inventory/voucher/${res.data.id}`);
    } catch (err) {
      console.error("❌ Lỗi lưu phiếu:", err.response?.data || err.message);
      toast.error("Lưu phiếu thất bại!");
    }
  };

  const exportPDF = async () => {
    try {
      toast.loading("Đang tạo PDF...", { id: "pdf" });
      const canvas = await html2canvas(pdfRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${info.voucherNo || "phieu"}_${type}.pdf`);
      toast.success("📄 Xuất PDF thành công!", { id: "pdf" });
    } catch (err) {
      console.error("❌ Xuất PDF lỗi:", err);
      toast.error("Không thể xuất PDF", { id: "pdf" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-2">
        {type === "PNK" ? "Phiếu Nhập Kho (03-VT)" : "Phiếu Xuất Kho (04-VT)"}
      </h2>

      {/* FORM THÔNG TIN */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label>Hộ, cá nhân kinh doanh *</label>
          <input
            className={`border rounded w-full px-2 py-1 mb-1 ${required("businessName")}`}
            value={info.businessName}
            onBlur={() => markTouched("businessName")}
            onChange={(e) => setInfo({ ...info, businessName: e.target.value })}
          />
          <label>Địa chỉ *</label>
          <input
            className={`border rounded w-full px-2 py-1 mb-1 ${required("address")}`}
            value={info.address}
            onBlur={() => markTouched("address")}
            onChange={(e) => setInfo({ ...info, address: e.target.value })}
          />
          <label>Số phiếu</label>
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            value={info.voucherNo}
            onChange={(e) => setInfo({ ...info, voucherNo: e.target.value })}
          />
        </div>

        <div>
          <label>Người giao/nhận</label>
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            value={info.supplier || info.receiver}
            onChange={(e) => setInfo({ ...info, supplier: e.target.value, receiver: e.target.value })}
          />
          <label>Địa điểm nhập/xuất *</label>
          <input
            className={`border rounded w-full px-2 py-1 mb-1 ${required("location")}`}
            value={info.location}
            onBlur={() => markTouched("location")}
            onChange={(e) => setInfo({ ...info, location: e.target.value })}
          />
          <label>Lý do / ghi chú</label>
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            value={info.reason}
            onChange={(e) => setInfo({ ...info, reason: e.target.value })}
          />
        </div>
      </div>

      {/* BẢNG HÀNG */}
      <LineItemsTable rows={rows} setRows={setRows} editable={true} isEntry={type === "PNK"} />

      {/* NÚT HÀNH ĐỘNG */}
      <div className="flex justify-between mt-4 items-center">
        <div>
          Tổng tiền: <b>{total.toLocaleString()} đ</b>
        </div>
        <div className="flex gap-3">
          <button
            onClick={saveVoucher}
            className={`flex items-center gap-1 px-4 py-2 rounded text-white ${
              isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!isValid}
          >
            💾 Lưu phiếu
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1 px-4 py-2 rounded border hover:bg-gray-100"
          >
            📄 Xuất PDF
          </button>
        </div>
      </div>

      {/* PDF ẨN */}
      <div style={{ position: "absolute", left: -9999, top: 0 }}>
        <PrintPreview ref={pdfRef} info={info} rows={rows} total={total} type={type} />
      </div>
    </div>
  );
}
