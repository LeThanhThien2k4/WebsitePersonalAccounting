// backend/src/routes/reports.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.use(verifyToken);

/* ======================================================
   HELPER: Build date-range
====================================================== */
function buildDateRange({ year, month, quarter }) {
  const y = Number(year);
  if (!y) throw new Error("Năm không hợp lệ");

  // Theo tháng
  if (month && Number(month) > 0) {
    const m = Number(month);
    return {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 1),
      months: [m],
    };
  }

  // Theo quý
  if (quarter && Number(quarter) > 0) {
    const q = Number(quarter);
    const map = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    };
    const months = map[q];
    return {
      start: new Date(y, months[0] - 1, 1),
      end: new Date(y, months[2], 1),
      months,
    };
  }

  // Cả năm
  return {
    start: new Date(y, 0, 1),
    end: new Date(y + 1, 0, 1),
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  };
}

function formatDateVN(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN");
}

const toN = (v) => Number(v || 0);

/* ======================================================
   SUMMARY → FE table
====================================================== */
router.get("/summary", async (req, res) => {
  try {
    const { month, quarter, year } = req.query;
    const { start, end, months } = buildDateRange({ year, month, quarter });
    const userId = req.user.id;

    // Phiếu thu
    const receipts = await prisma.receipt.findMany({
      where: { createdBy: userId, date: { gte: start, lt: end } },
    });

    // Phiếu chi
    const payments = await prisma.payment.findMany({
      where: { createdBy: userId, date: { gte: start, lt: end } },
    });

    // Phiếu nhập / xuất kho
    const vouchers = await prisma.voucher.findMany({
      where: { createdBy: userId, date: { gte: start, lt: end } },
    });

    // Bảng lương các tháng trong kỳ
    const payrollPeriods = await prisma.payrollPeriod.findMany({
      where: { ownerId: userId, year: Number(year), month: { in: months } },
      include: { items: true },
    });

    // Map voucherId -> inventoryItemId (lấy mặt hàng đầu tiên của mỗi phiếu)
    let itemMap = {};
    if (vouchers.length > 0) {
      const voucherIds = vouchers.map((v) => v.id);
      const voucherItems = await prisma.item.findMany({
        where: {
          voucherId: { in: voucherIds },
          inventoryItemId: { not: null },
        },
        select: {
          voucherId: true,
          inventoryItemId: true,
        },
      });

      voucherItems.forEach((it) => {
        // Nếu 1 phiếu có nhiều mặt hàng, lấy cái đầu tiên
        if (!itemMap[it.voucherId]) {
          itemMap[it.voucherId] = it.inventoryItemId;
        }
      });
    }

    const rows = [];

    // S1 – Phiếu thu
    receipts.forEach((r) =>
      rows.push({
        date: r.date,
        dateVN: formatDateVN(r.date),
        type: "Phiếu thu",
        reason: r.reason,
        amount: toN(r.amount), // dương
        reportCode: "S1",
      })
    );

    // S3 – Phiếu chi
    payments.forEach((p) =>
      rows.push({
        date: p.date,
        dateVN: formatDateVN(p.date),
        type: "Phiếu chi",
        reason: p.reason,
        amount: -toN(p.amount), // âm (chi phí)
        reportCode: "S3",
      })
    );

    // S2 – Nhập / Xuất kho (hàng hóa)
    vouchers.forEach((v) =>
      rows.push({
        date: v.date,
        dateVN: formatDateVN(v.date),
        type: v.type === "PNK" ? "Nhập kho" : "Xuất kho",
        reason: v.reason,
        amount: v.type === "PNK" ? -toN(v.totalAmount) : toN(v.totalAmount),
        reportCode: "S2",
        // gắn itemId để FE tự in S2 theo mặt hàng
        itemId: itemMap[v.id] || null,
      })
    );

    // S5 – Lương
    payrollPeriods.forEach((p) => {
      const last = new Date(p.year, p.month, 0);
      const totalNet = p.items.reduce((s, i) => s + toN(i.netPay), 0);
      if (totalNet) {
        rows.push({
          date: last,
          dateVN: formatDateVN(last),
          type: "Lương",
          reason: `Lương tháng ${p.month}/${p.year}`,
          amount: -totalNet, // chi phí lương
          reportCode: "S5",
        });
      }
    });

    // Sắp xếp theo ngày
    rows.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Tổng hợp doanh thu / chi phí / lợi nhuận
    const revenue = rows
      .filter((r) => r.amount > 0)
      .reduce((s, r) => s + r.amount, 0);

    const expense = rows
      .filter((r) => r.amount < 0)
      .reduce((s, r) => s + r.amount, 0); // âm

    res.json({
      revenue,
      expense,
      profit: revenue + expense,
      rows,
    });
  } catch (err) {
    console.error("SUMMARY ERROR:", err);
    res.status(500).json({ error: "Không thể tải báo cáo tổng hợp" });
  }
});

/* ======================================================
   S1-HKD – DOANH THU
====================================================== */
router.get("/s1/pdf", async (req, res) => {
  try {
    const { month, year } = req.query;
    const { start, end } = buildDateRange({ month, year });
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, address: true },
    });

    const receipts = await prisma.receipt.findMany({
      where: { createdBy: userId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    });

    const rows = receipts.map((r, idx) => ({
      stt: idx + 1,
      dateVN: formatDateVN(r.date),
      no: r.id,
      docDateVN: formatDateVN(r.date),
      desc: r.reason || "",
      col1: toN(r.amount),
    }));

    const totals = {
      col1: rows.reduce((s, r) => s + r.col1, 0),
    };

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/s1-hkd.ejs"),
      {
        year: Number(year),
        month: Number(month),
        businessName: user?.businessName,
        address: user?.address,
        rows,
        totals,
      }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.end(pdf);
  } catch (err) {
    console.error("S1 ERROR:", err);
    res.status(500).json({ error: "Không thể xuất S1" });
  }
});

/* ======================================================
   S2-HKD – HÀNG HOÁ / TỒN – Item-based
====================================================== */
router.get("/s2/pdf", async (req, res) => {
  try {
    const { year, month, itemId } = req.query;
    const userId = req.user.id;

    if (!itemId) return res.status(400).json({ error: "Thiếu itemId" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, address: true }
    });

    const item = await prisma.inventoryItem.findFirst({
      where: { id: Number(itemId), createdBy: userId }
    });

    if (!item)
      return res.status(404).json({ error: "Không tìm thấy mặt hàng" });

    const sellPrice = Number(item.unitPriceOut || 0);

    const { start, end } = buildDateRange({ year, month });

    const entries = await prisma.item.findMany({
      where: { inventoryItemId: Number(itemId) },
      include: { voucher: true },
      orderBy: { voucher: { date: "asc" } }
    });

    // ===== TỒN ĐẦU KỲ =====
    let openingQty = 0;
    entries
      .filter(e => e.voucher.date < start)
      .forEach(e => {
        const q = Number(e.qtyActual);
        if (e.voucher.type === "PNK") openingQty += q;
        else if (e.voucher.type === "PXK") openingQty -= q;
      });

    let balanceQty = openingQty;

    const rows = [];
    let totalInQty = 0;
    let totalInCost = 0;
    let totalOutQty = 0;
    let totalOutCost = 0;

    // ===== TRONG KỲ =====
    entries
      .filter(e => e.voucher.date >= start && e.voucher.date < end)
      .forEach(e => {
        const qty = Number(e.qtyActual);
        const price = Number(e.unitPrice);

        let qtyIn = 0, qtyOut = 0;
        let totalIn = 0, totalOut = 0;

        if (e.voucher.type === "PNK") {
          qtyIn = qty;
          totalIn = qty * price;

          balanceQty += qty;
          totalInQty += qty;
          totalInCost += totalIn;

        } else {
          qtyOut = qty;
          totalOut = qty * sellPrice;

          balanceQty -= qty;
          totalOutQty += qty;
          totalOutCost += totalOut;
        }

        rows.push({
          docNo: e.voucher.voucherNo,
          dateVN: formatDateVN(e.voucher.date),
          desc: e.voucher.reason,
          unit: item.unit,
          price,
          qtyIn,
          totalIn,
          qtyOut,
          totalOut,
          balanceQty,
          balanceCost: balanceQty * sellPrice
        });
      });

    // ===== TỒN CUỐI KỲ =====
    const closingQty = totalInQty - totalOutQty;
    const closingCost = closingQty * sellPrice;

    // ===== SỐ DƯ CUỐI KÌ (LỢI NHUẬN RÒNG) =====
    const closingBalance = totalOutCost - totalInCost + closingCost;

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/s2-hkd.ejs"),
      {
        businessName: user?.businessName,
        address: user?.address,
        itemName: item.name,
        year: Number(year),

        openingQty,
        openingCost: openingQty * sellPrice,

        rows,

        totalInQty,
        totalInCost,
        totalOutQty,
        totalOutCost,

        closingQty,
        closingCost,
        closingBalance
      }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html);

    const pdf = await page.pdf({ format: "A4", printBackground: true });

    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.end(pdf);

  } catch (err) {
    console.error("S2 ERROR:", err);
    res.status(500).json({ error: "Không thể xuất S2" });
  }
});



/* ======================================================
   S3-HKD – CHI PHÍ (Payment)
====================================================== */
router.get("/s3/pdf", async (req, res) => {
  try {
    const { year, month } = req.query;
    const { start, end } = buildDateRange({ year, month });
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, address: true },
    });

    const payments = await prisma.payment.findMany({
      where: { createdBy: userId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    });

    const rows = payments.map((p, idx) => ({
      index: idx + 1,
      dateVN: formatDateVN(p.date),
      docNo: p.id,
      desc: p.reason || "",
      total: toN(p.amount),
    }));

    const totals = {
      total: rows.reduce((s, r) => s + r.total, 0),
    };

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/s3-hkd.ejs"),
      {
        year: Number(year),
        businessName: user?.businessName,
        address: user?.address,
        rows,
        totals,
      }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.end(pdf);
  } catch (err) {
    console.error("S3 ERROR:", err);
    res.status(500).json({ error: "Không thể xuất S3" });
  }
});

/* ======================================================
   S4-HKD – THUẾ (placeholder)
====================================================== */
router.get("/s4/pdf", async (req, res) => {
  try {
    const userId = req.user.id;
    const { year } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, address: true },
    });

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/s4-hkd.ejs"),
      {
        year: Number(year),
        businessName: user?.businessName,
        address: user?.address,
        rows: [],
        totals: {},
      }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.end(pdf);
  } catch (err) {
    console.error("S4 ERROR:", err);
    res.status(500).json({ error: "Không thể xuất S4" });
  }
});

/* ======================================================
   S5-HKD – LƯƠNG
====================================================== */
router.get("/s5/pdf", async (req, res) => {
  try {
    const { year, month, quarter } = req.query;
    const { months } = buildDateRange({ year, month, quarter });
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, address: true },
    });

    const periods = await prisma.payrollPeriod.findMany({
      where: {
        ownerId: userId,
        year: Number(year),
        month: { in: months },
      },
      include: {
        items: { include: { employee: true, payout: true } },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    const rows = [];

    periods.forEach((p) => {
      const payDate = new Date(p.year, p.month, 0);

      p.items.forEach((i) => {
        rows.push({
          dateVN: formatDateVN(payDate),
          docNo: `BP-${p.month}/${p.year}-${i.employeeId}`,
          desc: `Lương ${i.employee?.fullName || ""} tháng ${p.month}/${p.year}`,
          wageMust: toN(i.netPay),
          wagePaid: toN(i.payout?.amount),
          wageRemain: toN(i.netPay) - toN(i.payout?.amount),
          bhxhMust: toN(i.bhxhEmp),
          bhxhPaid: 0,
          bhxhRemain: toN(i.bhxhEmp),
          bhytMust: toN(i.bhytEmp),
          bhytPaid: 0,
          bhytRemain: toN(i.bhytEmp),
          bhtnMust: toN(i.bhtnEmp),
          bhtnPaid: 0,
          bhtnRemain: toN(i.bhtnEmp),
        });
      });
    });

    const totals = rows.reduce(
      (a, r) => {
        a.wageMust += r.wageMust;
        a.wagePaid += r.wagePaid;
        a.wageRemain += r.wageRemain;
        a.bhxhMust += r.bhxhMust;
        a.bhxhRemain += r.bhxhRemain;
        a.bhytMust += r.bhytMust;
        a.bhytRemain += r.bhytRemain;
        a.bhtnMust += r.bhtnMust;
        a.bhtnRemain += r.bhtnRemain;
        return a;
      },
      {
        wageMust: 0,
        wagePaid: 0,
        wageRemain: 0,
        bhxhMust: 0,
        bhxhRemain: 0,
        bhytMust: 0,
        bhytRemain: 0,
        bhtnMust: 0,
        bhtnRemain: 0,
      }
    );

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/s5-hkd.ejs"),
      {
        year: Number(year),
        businessName: user?.businessName,
        address: user?.address,
        rows,
        totals,
      }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.end(pdf);
  } catch (err) {
    console.error("S5 ERROR:", err);
    res.status(500).json({ error: "Không thể xuất S5" });
  }
});

export default router;
