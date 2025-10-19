import express from "express";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// ======= Xuất Excel phiếu thu/chi =========
router.get("/excel/:type", verifyToken, async (req, res) => {
  const { type } = req.params;
  const model = type === "receipts" ? prisma.receipt : prisma.payment;
  const records = await model.findMany({ orderBy: { date: "desc" } });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(type.toUpperCase());
  sheet.addRow(["ID", "Ngày", "Người", "Lý do", "Số tiền", "Phương thức"]);

  records.forEach(r => {
    sheet.addRow([
      r.id,
      r.date.toISOString().split("T")[0],
      type === "receipts" ? r.payer : r.payee,
      r.reason,
      Number(r.amount),
      r.method,
    ]);
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${type}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

// ======= Xuất PDF sổ quỹ tiền mặt =========
router.get("/pdf/S6", verifyToken, async (_req, res) => {
  const receipts = await prisma.receipt.findMany({ where: { method: "cash" } });
  const payments = await prisma.payment.findMany({ where: { method: "cash" } });
  const ledger = [
    ...receipts.map(r => ({ date: r.date, desc: r.reason, amount: r.amount, type: "THU" })),
    ...payments.map(p => ({ date: p.date, desc: p.reason, amount: -p.amount, type: "CHI" })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const doc = new PDFDocument({ margin: 30, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=S6_So_Quy_Tien_Mat.pdf");
  doc.pipe(res);

  doc.fontSize(16).text("SỔ QUỸ TIỀN MẶT", { align: "center" });
  doc.moveDown();
  ledger.forEach(l =>
    doc.fontSize(12).text(`${l.date.toISOString().split("T")[0]} | ${l.type} | ${l.desc} | ${l.amount} VND`)
  );
  doc.end();
});

export default router;
