import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

function dateFilter(from, to) {
  if (!from || !to) return {};
  return {
    date: {
      gte: new Date(from),
      lte: new Date(to),
    },
  };
}

// ===============================
// S1 - Doanh thu
// ===============================
router.get("/S1", verifyToken, async (req, res) => {
  const { from, to } = req.query;
  const receipts = await prisma.receipt.findMany({
    where: {
      createdBy: req.user.id,                        // ✅ lọc theo user
      reason: { contains: "doanh thu", mode: "insensitive" },
      ...dateFilter(from, to),
    },
  });
  const total = receipts.reduce((sum, r) => sum + Number(r.amount), 0);
  res.json({ from, to, total, receipts });
});

// ===============================
// S2 - Hàng hóa / vật tư tồn
// ===============================
router.get("/S2", verifyToken, async (req, res) => {
  const { from, to } = req.query;
  const imports = await prisma.inventoryIn.findMany({
    where: { createdBy: req.user.id, ...dateFilter(from, to) },
  });
  const exports = await prisma.inventoryOut.findMany({
    where: { createdBy: req.user.id, ...dateFilter(from, to) },
  });
  const totalImport = imports.reduce((s, i) => s + Number(i.total), 0);
  const totalExport = exports.reduce((s, i) => s + Number(i.total), 0);
  const balance = totalImport - totalExport;
  res.json({ from, to, totalImport, totalExport, balance, imports, exports });
});

// ===============================
// S3 - Chi phí SXKD
// ===============================
router.get("/S3", verifyToken, async (req, res) => {
  const { from, to } = req.query;
  const payments = await prisma.payment.findMany({
    where: {
      createdBy: req.user.id,                       // ✅ thêm
      reason: { contains: "chi phí", mode: "insensitive" },
      ...dateFilter(from, to),
    },
  });
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  res.json({ from, to, total, payments });
});

// ===============================
// S4 - Thuế với NSNN
// ===============================
router.get("/S4", verifyToken, async (req, res) => {
  const { from, to } = req.query;
  const taxPayments = await prisma.payment.findMany({
    where: {
      createdBy: req.user.id,                       // ✅ thêm
      reason: { contains: "thuế", mode: "insensitive" },
      ...dateFilter(from, to),
    },
  });
  const totalTax = taxPayments.reduce((sum, t) => sum + Number(t.amount), 0);
  res.json({ from, to, totalTax, taxPayments });
});

// ===============================
// S5 - Tiền lương
// ===============================
router.get("/S5", verifyToken, async (req, res) => {
  const { from, to } = req.query;
  const payrolls = await prisma.payroll.findMany({
    where: { createdBy: req.user.id, ...dateFilter(from, to) },
  });
  const totalPayroll = payrolls.reduce((sum, p) => sum + Number(p.total), 0);
  res.json({ from, to, totalPayroll, payrolls });
});

// ===============================
// S6 - Sổ quỹ tiền mặt
// ===============================
router.get("/S6", verifyToken, async (req, res) => {
  const { from, to } = req.query;

  const receipts = await prisma.receipt.findMany({
    where: { createdBy: req.user.id, method: "cash", ...dateFilter(from, to) },
  });

  const payments = await prisma.payment.findMany({
    where: { createdBy: req.user.id, method: "cash", ...dateFilter(from, to) },
  });

  const ledger = [
    ...receipts.map(r => ({ ...r, type: "THU" })),
    ...payments.map(p => ({ ...p, amount: -p.amount, type: "CHI" })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalIn = receipts.reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = totalIn - totalOut;

  res.json({ from, to, totalIn, totalOut, balance, ledger });
});

// ===============================
// S7 - Sổ tiền gửi ngân hàng
// ===============================
router.get("/S7", verifyToken, async (req, res) => {
  const { from, to } = req.query;
  const receipts = await prisma.receipt.findMany({
    where: { createdBy: req.user.id, method: "bank", ...dateFilter(from, to) },
  });
  const payments = await prisma.payment.findMany({
    where: { createdBy: req.user.id, method: "bank", ...dateFilter(from, to) },
  });

  const ledger = [
    ...receipts.map(r => ({ ...r, type: "THU" })),
    ...payments.map(p => ({ ...p, amount: -p.amount, type: "CHI" })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalIn = receipts.reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = payments.reduce((s, p) => s + Number(p.amount), 0);
  res.json({ from, to, totalIn, totalOut, balance: totalIn - totalOut, ledger });
});

export default router;
