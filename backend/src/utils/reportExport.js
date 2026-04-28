// backend/src/utils/reportExport.js
import PdfPrinter from "pdfmake";

/**
 * Xuất PDF sổ kế toán (S6/S7) theo TT88.
 * Có chữ ký Người lập sổ – Chủ hộ – Kế toán trưởng.
 * Tự động fix lỗi Content-Disposition với tên file không hợp lệ.
 */
export const exportLedgerPDF = async (ledgerData, title, res) => {
  try {
    const fonts = {
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    };
    const printer = new PdfPrinter(fonts);

    const body = [
      [
        { text: "Ngày", style: "tableHeader" },
        { text: "Loại", style: "tableHeader" },
        { text: "Nội dung", style: "tableHeader" },
        { text: "Số tiền (VNĐ)", style: "tableHeader", alignment: "right" },
        { text: "Số dư (VNĐ)", style: "tableHeader", alignment: "right" },
      ],
    ];

    ledgerData.forEach((r) => {
      body.push([
        { text: new Date(r.date).toLocaleDateString("vi-VN"), style: "tableCell" },
        { text: r.type, alignment: "center", style: "tableCell" },
        { text: r.reason || "", style: "tableCell" },
        {
          text: (r.signedAmount > 0 ? "+" : "") + Number(r.signedAmount || 0).toLocaleString("vi-VN"),
          alignment: "right",
          color: (r.signedAmount || 0) >= 0 ? "green" : "red",
          style: "tableCell",
        },
        {
          text: Number(r.balance || 0).toLocaleString("vi-VN"),
          alignment: "right",
          style: "tableCell",
        },
      ]);
    });

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 80],
      content: [
        { text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", alignment: "center", bold: true },
        { text: "Độc lập - Tự do - Hạnh phúc", alignment: "center", margin: [0, 0, 0, 10] },
        { text: title, style: "header", alignment: "center", margin: [0, 20, 0, 10] },
        {
          text: "Mẫu số: S6-HKD / S7-HKD - Theo Thông tư 88/2021/TT-BTC",
          alignment: "right",
          italics: true,
          fontSize: 9,
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ["auto", "auto", "*", "auto", "auto"],
            body,
          },
          layout: {
            fillColor: (i) => (i === 0 ? "#f3f3f3" : null),
            hLineColor: () => "#ccc",
            vLineColor: () => "#ccc",
          },
        },
        {
          text: `\nNgày in: ${new Date().toLocaleDateString("vi-VN")}`,
          alignment: "right",
          fontSize: 10,
          margin: [0, 20, 0, 10],
        },
        {
          columns: [
            {
              width: "33%",
              text: [
                { text: "NGƯỜI LẬP SỔ\n", bold: true },
                { text: "(Ký, họ tên)\n\n\n\n\n", italics: true },
              ],
              alignment: "center",
            },
            {
              width: "33%",
              text: [
                { text: "CHỦ HỘ\n", bold: true },
                { text: "(Ký, họ tên)\n\n\n\n\n", italics: true },
              ],
              alignment: "center",
            },
            {
              width: "33%",
              text: [
                { text: "KẾ TOÁN TRƯỞNG\n", bold: true },
                { text: "(Ký, họ tên)\n\n\n\n\n", italics: true },
              ],
              alignment: "center",
            },
          ],
          margin: [0, 30, 0, 0],
        },
      ],
      styles: {
        header: { fontSize: 14, bold: true },
        tableHeader: { bold: true, fontSize: 11, fillColor: "#e0e0e0", alignment: "center" },
        tableCell: { fontSize: 10, margin: [2, 4, 2, 4] },
      },
      defaultStyle: { font: "Helvetica" },
    };

    // 🔧 Fix lỗi "Invalid character in header"
    const safeTitle = title.replace(/[^\w\d_\-\.]/g, "_");

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeTitle}.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    console.error("❌ Lỗi tạo PDF:", err.message);
    res.status(500).json({ error: "Không thể xuất PDF" });
  }
};
