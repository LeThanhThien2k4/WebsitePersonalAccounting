// backend/src/routes/export.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { moneyToWordsVn } from "../utils/moneyHelper.js";

const prisma = new PrismaClient();
const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* === PHIẾU CHI === */
router.get("/payment/pdf", verifyToken, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: Number(req.query.id) },
    });
    if (!payment || payment.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy phiếu chi" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { businessName: true, address: true },
    });

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/payment.ejs"),
      {
        businessName: user?.businessName || "Hộ/CN kinh doanh",
        address: user?.address || "—",
        payee: payment.payee,
        addressPayee: "",
        reason: payment.reason,
        amount: payment.amount,
        amountText: moneyToWordsVn(payment.amount),
        attach: "",
        date: payment.date.toLocaleDateString("vi-VN"),
        method: payment.method === "cash" ? "Tiền mặt" : "Chuyển khoản",
      }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="phieu-chi-${payment.id}.pdf"`
    );
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi tạo PDF phiếu chi:", err);
    res.status(500).json({ error: err.message });
  }
});

/* === PHIẾU THU === */
router.get("/receipt/pdf", verifyToken, async (req, res) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: Number(req.query.id) },
    });
    if (!receipt || receipt.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy phiếu thu" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { businessName: true, address: true },
    });

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/receipt.ejs"),
      {
        businessName: user?.businessName || "Hộ/CN kinh doanh",
        address: user?.address || "—",
        payer: receipt.payer,
        reason: receipt.reason,
        amount: receipt.amount,
        amountText: moneyToWordsVn(receipt.amount),
        attach: "",
        date: receipt.date.toLocaleDateString("vi-VN"),
        method: receipt.method === "cash" ? "Tiền mặt" : "Chuyển khoản",
      }
    );

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="phieu-thu-${receipt.id}.pdf"`
    );
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi tạo PDF phiếu thu:", err);
    res.status(500).json({ error: err.message });
  }
});

/* === PHIẾU NHẬP / XUẤT KHO === */
router.get("/inventory/pdf", verifyToken, async (req, res) => {
  try {
    const { id, type } = req.query;
    const isEntry = type === "PNK";

    const voucher = await prisma.voucher.findUnique({
      where: { id: Number(id) },
      include: { items: { include: { inventoryItem: true } } },
    });
    if (!voucher || voucher.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy phiếu kho" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { businessName: true, address: true },
    });

    const total = voucher.items.reduce(
      (s, i) => s + Number(i.unitPrice || 0) * Number(i.qtyActual || 0),
      0
    );

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/inventory.ejs"),
      {
        isEntry,
        businessName: user?.businessName || "Hộ/CN kinh doanh",
        address: user?.address || "—",
        voucherNo: voucher.voucherNo || "",
        supplier: isEntry ? voucher.supplier : "",
        receiver: !isEntry ? voucher.receiver : "",
        reason: voucher.reason || "",
        location: voucher.location || "",
        attachedDocs: voucher.attachedDocs || "",
        items: voucher.items.map((i) => ({
          name: i.inventoryItem?.name || i.name || "",
          code: i.inventoryItem?.code || i.code || "",
          unit: i.inventoryItem?.unit || i.unit || "",
          qtyDocumented: i.qtyDocumented,
          qtyActual: i.qtyActual,
          unitPrice: i.unitPrice,
          amount: Number(i.unitPrice) * Number(i.qtyActual),
        })),
        total,
        amountText: moneyToWordsVn(total),
      }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="phieu-${isEntry ? "nhap" : "xuat"}-${voucher.id}.pdf"`
    );
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi xuất PDF phiếu kho:", err);
    res.status(500).json({ error: err.message });
  }
});
/* === Xuất PDF Bảng lương (05-LĐTL) === */
router.get("/payroll/pdf", verifyToken, async (req, res) => {
  try {
    const { id } = req.query;
    const period = await prisma.payrollPeriod.findFirst({
      where: { id: Number(id), ownerId: req.user.id },
      include: {
        owner: true,
        items: { include: { employee: true } },
      },
    });
    if (!period) return res.status(404).json({ error: "Không tìm thấy kỳ lương" });

    const rows = period.items.map((it, i) => ({
      stt: i + 1,
      name: it.employee?.fullName || "",
      position: it.employee?.position || "",
      salaryBase: it.salaryBase,
      daysWorked: it.daysWorked,
      otHours: it.otHours,
      allowances: it.allowances,
      bonus: it.bonus,
      otherIncome: it.otherIncome,
      deductUnpaid: it.deductUnpaid,
      advance: it.advance,
      bhxhEmp: it.bhxhEmp,
      bhytEmp: it.bhytEmp,
      bhtnEmp: it.bhtnEmp,
      unionEmp: it.unionEmp,
      gross: it.gross,
      netPay: it.netPay,
    }));

    const total = rows.reduce((a, r) => {
      a.gross += Number(r.gross || 0);
      a.netPay += Number(r.netPay || 0);
      return a;
    }, { gross: 0, netPay: 0 });

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/payroll.ejs"),
      {
        month: period.month,
        year: period.year,
        business: period.owner?.businessName || "Hộ/CN kinh doanh",
        address: period.owner?.address || "",
        rows,
        total,
        amountText: moneyToWordsVn(total.netPay),
      }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
    });

    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="05-LDTL_${period.month}-${period.year}.pdf"`
    );
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi tạo PDF bảng lương:", err);
    res.status(500).json({ error: err.message });
  }
});


/* === SỔ KẾ TOÁN (S6 / S7) === */
router.get("/ledger/pdf/:type", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const method = type === "S6" ? "cash" : "bank";

    const receipts = await prisma.receipt.findMany({
      where: { createdBy: req.user.id, method },
    });
    const payments = await prisma.payment.findMany({
      where: { createdBy: req.user.id, method },
    });

    const ledger = [
      ...receipts.map((r) => ({
        date: r.date,
        reason: r.reason,
        amount: r.amount,
        type: "THU",
      })),
      ...payments.map((p) => ({
        date: p.date,
        reason: p.reason,
        amount: -p.amount,
        type: "CHI",
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/ledger.ejs"),
      {
        title:
          type === "S6"
            ? "SỔ QUỸ TIỀN MẶT (S6-HKD)"
            : "SỔ TIỀN GỬI NGÂN HÀNG (S7-HKD)",
        ledger,
      }
    );

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${type}.pdf"`);
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi tạo PDF sổ kế toán:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
