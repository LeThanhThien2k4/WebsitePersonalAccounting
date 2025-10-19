import PdfPrinter from "pdfmake";
import ExcelJS from "exceljs";
import fs from "fs";
import { exportLedgerPDF, exportLedgerExcel } from "../utils/reportExport.js";


export const exportLedgerPDF = async (ledgerData, title, res) => {
  const fonts = {
    Roboto: {
      normal: "node_modules/pdfmake/build/vfs_fonts.js"
    }
  };
  const printer = new PdfPrinter(fonts);

  const body = [
    [{ text: "Ngày", bold: true }, { text: "Nội dung" }, { text: "Số tiền" }]
  ];
  ledgerData.forEach(r => {
    body.push([r.date, r.reason, r.amount]);
  });

  const docDefinition = {
    content: [
      { text: title, style: "header" },
      { table: { body } }
    ],
    styles: { header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] } }
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  res.setHeader("Content-Type", "application/pdf");
  pdfDoc.pipe(res);
  pdfDoc.end();
};

export const exportLedgerExcel = async (ledgerData, title, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title);
  ws.addRow(["Ngày", "Nội dung", "Số tiền"]);
  ledgerData.forEach(r => ws.addRow([r.date, r.reason, r.amount]));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${title}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
};


router.get("/S6/export/:type", async (req, res) => {
  const receipts = await prisma.receipts.findMany({ where: { method: "cash" } });
  const payments = await prisma.payments.findMany({ where: { method: "cash" } });
  const ledger = [
    ...receipts.map(r => ({ ...r, type: "THU" })),
    ...payments.map(p => ({ ...p, amount: -p.amount, type: "CHI" }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const type = req.params.type;
  if (type === "pdf") return exportLedgerPDF(ledger, "Sổ quỹ tiền mặt (S6-HKD)", res);
  if (type === "excel") return exportLedgerExcel(ledger, "Sổ quỹ tiền mặt (S6-HKD)", res);
  res.status(400).send("Invalid export type");
});
