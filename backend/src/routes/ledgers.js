// backend/src/routes/ledgers.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";
import { buildLedgerData } from "../utils/ledgerHelper.js";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* -------------------- Helper -------------------- */
function dateFilter(from, to) {
  const f = {};
  if (from && to) f.date = { gte: new Date(from), lte: new Date(to) };
  else if (from) f.date = { gte: new Date(from) };
  else if (to) f.date = { lte: new Date(to) };
  return f;
}

/* -------------------- S1 - Doanh thu -------------------- */
router.get("/S1", verifyToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const receipts = await prisma.receipt.findMany({
      where: {
        createdBy: req.user.id,
        reason: { contains: "doanh thu", mode: "insensitive" },
        ...dateFilter(from, to),
      },
      select: { id: true, date: true, payer: true, reason: true, amount: true },
      orderBy: { date: "asc" },
    });
    const total = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);
    res.json({ from, to, total, receipts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -------------------- S2 - Vật tư, hàng hóa -------------------- */
router.get("/S2", verifyToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const imports = await prisma.inventoryTxn.findMany({
      where: { createdBy: req.user.id, type: "IN", ...dateFilter(from, to) },
      select: { id: true, itemId: true, quantity: true, unitPrice: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const exports = await prisma.inventoryTxn.findMany({
      where: { createdBy: req.user.id, type: "OUT", ...dateFilter(from, to) },
      select: { id: true, itemId: true, quantity: true, unitPrice: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const mul = (q, p) => Number(q || 0) * Number(p || 0);
    const totalImport = imports.reduce((s, i) => s + mul(i.quantity, i.unitPrice), 0);
    const totalExport = exports.reduce((s, i) => s + mul(i.quantity, i.unitPrice), 0);
    const balance = totalImport - totalExport;

    res.json({ from, to, totalImport, totalExport, balance, imports, exports });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -------------------- S3 - Chi phí SXKD -------------------- */
router.get("/S3", verifyToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const payments = await prisma.payment.findMany({
      where: {
        createdBy: req.user.id,
        reason: { contains: "chi phí", mode: "insensitive" },
        ...dateFilter(from, to),
      },
      select: { id: true, date: true, payee: true, reason: true, amount: true },
      orderBy: { date: "asc" },
    });
    const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    res.json({ from, to, total, payments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -------------------- S4 - Thuế với NSNN -------------------- */
router.get("/S4", verifyToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const taxPayments = await prisma.payment.findMany({
      where: {
        createdBy: req.user.id,
        reason: { contains: "thuế", mode: "insensitive" },
        ...dateFilter(from, to),
      },
      select: { id: true, date: true, reason: true, amount: true },
      orderBy: { date: "asc" },
    });
    const totalTax = taxPayments.reduce((s, t) => s + Number(t.amount || 0), 0);
    res.json({ from, to, totalTax, taxPayments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -------------------- S5 - Thanh toán tiền lương -------------------- */
router.get("/S5", verifyToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateWhere = {};
    if (from && to) dateWhere.payDate = { gte: new Date(from), lte: new Date(to) };
    else if (from) dateWhere.payDate = { gte: new Date(from) };
    else if (to) dateWhere.payDate = { lte: new Date(to) };

    const payouts = await prisma.payrollPayout.findMany({
      where: { createdBy: req.user.id, ...dateWhere },
      select: { id: true, payDate: true, amount: true, method: true, paymentRef: true },
      orderBy: { payDate: "asc" },
    });

    const totalPayroll = payouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    res.json({ from, to, totalPayroll, payouts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -------------------- S6 - Sổ quỹ tiền mặt -------------------- */
router.get("/S6", verifyToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await buildLedgerData(prisma, req.user.id, "cash", from, to);
    res.json({ from, to, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -------------------- S7 - Sổ tiền gửi ngân hàng -------------------- */
router.get("/S7", verifyToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await buildLedgerData(prisma, req.user.id, "bank", from, to);
    res.json({ from, to, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -------------------- Xuất PDF server-side (Puppeteer) -------------------- */
router.get("/:sotype/export/pdf", verifyToken, async (req, res) => {
  try {
    const { sotype } = req.params;
    const { from, to } = req.query;

    if (!["S6", "S7"].includes(sotype))
      return res.status(400).json({ error: "Chỉ hỗ trợ xuất PDF cho S6 và S7" });

    const method = sotype === "S6" ? "cash" : "bank";
    const { ledger, totalIn, totalOut, balance } = await buildLedgerData(
      prisma,
      req.user.id,
      method,
      from,
      to
    );

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/ledger.ejs"),
      {
        title:
          sotype === "S6"
            ? "SỔ QUỸ TIỀN MẶT (S6-HKD)"
            : "SỔ TIỀN GỬI NGÂN HÀNG (S7-HKD)",
        businessName: req.user.businessName || "Hộ kinh doanh",
        address: req.user.address || "",
        rows: ledger,
        totalIn,
        totalOut,
        balance,
      }
    );

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sotype}_ledger.pdf"`
    );
    res.end(pdf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
