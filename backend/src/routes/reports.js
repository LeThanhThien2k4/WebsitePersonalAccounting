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

/* ===========================
 * Helper: build date range
 * =========================== */
function buildDateRange({ year, month, quarter }) {
  const y = Number(year);
  if (!y) throw new Error("Năm không hợp lệ");

  if (month && Number(month) > 0) {
    const m = Number(month);
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 1, 0, 0, 0, 0);
    return { start, end, months: [m] };
  }

  if (quarter && Number(quarter) > 0) {
    const q = Number(quarter);
    const map = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    };
    const months = map[q] || [1, 2, 3];
    const start = new Date(y, months[0] - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, months[2], 1, 0, 0, 0, 0);
    return { start, end, months };
  }

  // Cả năm
  const start = new Date(y, 0, 1, 0, 0, 0, 0);
  const end = new Date(y + 1, 0, 1, 0, 0, 0, 0);
  return {
    start,
    end,
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  };
}

// Helper: Date → dd/MM/yyyy theo giờ VN (+7)
function formatDateVN(date) {
  if (!date) return "";
  const d = new Date(date);
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = String(vn.getDate()).padStart(2, "0");
  const month = String(vn.getMonth() + 1).padStart(2, "0");
  const year = vn.getFullYear();
  return `${day}/${month}/${year}`;
}

const toN = (v) => Number(v || 0);

/* =====================================================
 * GET /api/reports/summary
 *  - Tổng hợp S1–S5: doanh thu, chi phí, lợi nhuận + chi tiết
 *  - Mỗi dòng có reportCode để FE biết bấm PDF nào
 *    + Phiếu thu       → S1 (S1-HKD – doanh thu)
 *    + Nhập/Xuất kho   → S2 (S2-HKD – vật tư, hàng hóa)
 *    + Phiếu chi       → S3 (S3-HKD – chi phí SXKD)
 *    + Lương           → S5 (S5-HKD – lương & BH)
 * ===================================================== */
router.get("/summary", async (req, res) => {
  try {
    const { month, quarter, year } = req.query;
    const { start, end, months } = buildDateRange({ month, quarter, year });
    const userId = req.user.id;

    // 1. Phiếu thu (Receipt) – S1
    const receipts = await prisma.receipt.findMany({
      where: {
        createdBy: userId,
        date: { gte: start, lt: end },
      },
    });

    // 2. Phiếu chi (Payment) – S3
    const payments = await prisma.payment.findMany({
      where: {
        createdBy: userId,
        date: { gte: start, lt: end },
      },
    });

    // 3. PNK / PXK (Voucher) – S2
    const vouchers = await prisma.voucher.findMany({
      where: {
        createdBy: userId,
        date: { gte: start, lt: end },
      },
    });

    // 4. Lương (Payroll) – S5
    const payrollPeriods = await prisma.payrollPeriod.findMany({
      where: {
        ownerId: userId,
        year: Number(year),
        month: { in: months },
      },
      include: {
        items: true,
      },
    });

    const rows = [];

    // Phiếu thu → Doanh thu +
    for (const r of receipts) {
      rows.push({
        date: r.date,
        dateVN: formatDateVN(r.date),
        type: "Phiếu thu",
        reason: r.reason || "",
        amount: toN(r.amount),
        reportCode: "S1",
      });
    }

    // Phiếu chi → Chi phí -
    for (const p of payments) {
      rows.push({
        date: p.date,
        dateVN: formatDateVN(p.date),
        type: "Phiếu chi",
        reason: p.reason || "",
        amount: -toN(p.amount),
        reportCode: "S3",
      });
    }

    // PNK / PXK → kho
    for (const v of vouchers) {
      const total = toN(v.totalAmount);
      let label = "";
      let sign = 0;

      if (v.type === "PNK") {
        label = "Nhập kho";
        sign = -1; // coi như chi phí mua hàng
      } else if (v.type === "PXK") {
        label = "Xuất kho";
        sign = 1; // coi như giá trị hàng xuất bán
      } else {
        continue;
      }

      rows.push({
        date: v.date,
        dateVN: formatDateVN(v.date),
        type: label,
        reason: v.reason || "",
        amount: sign * total,
        reportCode: "S2",
      });
    }

    // Lương → chi phí -
    for (const period of payrollPeriods) {
      const totalNet = period.items.reduce(
        (sum, it) => sum + toN(it.netPay),
        0
      );
      if (!totalNet) continue;

      const lastDay = new Date(period.year, period.month, 0);
      rows.push({
        date: lastDay,
        dateVN: formatDateVN(lastDay),
        type: "Lương",
        reason: period.note || `Lương tháng ${period.month}/${period.year}`,
        amount: -totalNet,
        reportCode: "S5",
      });
    }

    rows.sort((a, b) => new Date(a.date) - new Date(b.date));

    const revenue = rows
      .filter((r) => r.amount > 0)
      .reduce((s, r) => s + r.amount, 0);
    const expense = rows
      .filter((r) => r.amount < 0)
      .reduce((s, r) => s + r.amount, 0);
    const profit = revenue + expense;

    res.json({
      revenue,
      expense,
      profit,
      rows: rows.map((r) => ({
        date: r.date,
        dateVN: r.dateVN,
        type: r.type,
        reason: r.reason,
        amount: r.amount,
        reportCode: r.reportCode,
      })),
    });
  } catch (err) {
    console.error("❌ Lỗi báo cáo tổng hợp:", err);
    res.status(500).json({ error: "Không thể tải báo cáo tổng hợp" });
  }
});

/* =====================================================
 * S1-HKD – Sổ chi tiết doanh thu bán hàng hóa, dịch vụ
 * (Dữ liệu lấy từ phiếu thu trong kỳ)
 * ===================================================== */
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
      where: {
        createdBy: userId,
        date: { gte: start, lt: end },
      },
      orderBy: { date: "asc" },
    });

    const rows = receipts.map((r, idx) => ({
      stt: idx + 1,
      dateVN: formatDateVN(r.date),
      no: r.id.toString(),
      docDateVN: formatDateVN(r.date),
      desc: r.reason || `Thu tiền của ${r.payer}`,
      col1: toN(r.amount),
      col2: 0,
      col3: 0,
      col4: 0,
      col5: 0,
      col6: 0,
      col7: 0,
      note: "",
    }));

    const totalCol1 = rows.reduce((s, r) => s + r.col1, 0);

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/s1-hkd.ejs"),
      {
        year: Number(year),
        month: Number(month || 0),
        businessName: user?.businessName || "HỘ / CÁ NHÂN KINH DOANH",
        address: user?.address || "",
        rows,
        totals: {
          col1: totalCol1,
        },
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
      margin: { top: "10mm", bottom: "15mm", left: "10mm", right: "10mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="S1-HKD_${month || "all"}-${year}.pdf"`
    );
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi xuất PDF S1-HKD:", err);
    res.status(500).json({ error: "Không thể xuất PDF S1-HKD" });
  }
});

/* =====================================================
 * S3-HKD – Sổ chi phí sản xuất, kinh doanh
 * (Hiện tại lấy từ Phiếu chi – Payment)
 * ===================================================== */
router.get("/s3/pdf", async (req, res) => {
  try {
    const { month, year } = req.query;
    const { start, end } = buildDateRange({ month, year });
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, address: true },
    });

    const payments = await prisma.payment.findMany({
      where: {
        createdBy: userId,
        date: { gte: start, lt: end },
      },
      orderBy: { date: "asc" },
    });

    const rows = payments.map((p, idx) => ({
      index: idx + 1,
      dateVN: formatDateVN(p.date),
      docNo: p.id.toString(),
      docDateVN: formatDateVN(p.date),
      desc: p.reason || `Chi tiền cho ${p.payee}`,
      total: toN(p.amount),
      costLabor: 0,
      costElectric: 0,
      costWater: 0,
      costTelecom: 0,
      costRent: 0,
      costAdmin: 0,
      costOther: 0,
    }));

    const totals = rows.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.costLabor += r.costLabor;
        acc.costElectric += r.costElectric;
        acc.costWater += r.costWater;
        acc.costTelecom += r.costTelecom;
        acc.costRent += r.costRent;
        acc.costAdmin += r.costAdmin;
        acc.costOther += r.costOther;
        return acc;
      },
      {
        total: 0,
        costLabor: 0,
        costElectric: 0,
        costWater: 0,
        costTelecom: 0,
        costRent: 0,
        costAdmin: 0,
        costOther: 0,
      }
    );

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/s3-hkd.ejs"),
      {
        year: Number(year),
        businessName: user?.businessName || "HỘ / CÁ NHÂN KINH DOANH",
        address: user?.address || "",
        rows,
        totals,
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
      margin: { top: "10mm", bottom: "15mm", left: "10mm", right: "10mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="S3-HKD_${month || "all"}-${year}.pdf"`
    );
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi xuất PDF S3-HKD:", err);
    res.status(500).json({ error: "Không thể xuất PDF S3-HKD" });
  }
});

/* =====================================================
 * S4-HKD – Sổ theo dõi nghĩa vụ thuế với NSNN
 *  (hiện giờ để form trống số 0 để in ra, sau này có
 *   model Thuế thì chỉ cần thay phần lấy rows + totals)
 * ===================================================== */
router.get("/s4/pdf", async (req, res) => {
  try {
    const { year, taxType = "Thuế GTGT / TNCN" } = req.query;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, address: true },
    });

    const rows = [];
    const opening = { must: 0, paid: 0 };
    const totals = { must: 0, paid: 0 };
    const closing = { must: 0, paid: 0 };

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/s4-hkd.ejs"),
      {
        year: Number(year),
        taxType,
        businessName: user?.businessName || "HỘ / CÁ NHÂN KINH DOANH",
        address: user?.address || "",
        rows,
        opening,
        totals,
        closing,
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
      margin: { top: "10mm", bottom: "15mm", left: "10mm", right: "10mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="S4-HKD-${year}.pdf"`
    );
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi xuất PDF S4-HKD:", err);
    res.status(500).json({ error: "Không thể xuất PDF S4-HKD" });
  }
});

/* =====================================================
 * S5-HKD – Sổ thanh toán tiền lương và các khoản nộp theo lương
 * ===================================================== */
router.get("/s5/pdf", async (req, res) => {
  try {
    const { year } = req.query;
    const y = Number(year);
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, address: true },
    });

    const periods = await prisma.payrollPeriod.findMany({
      where: { ownerId: userId, year: y },
      include: {
        items: {
          include: { employee: true, payout: true },
        },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    const rows = [];

    for (const period of periods) {
      const payDate = new Date(period.year, period.month, 0);

      for (const item of period.items) {
        const must = toN(item.netPay); // số phải trả người lao động
        const paid = toN(item.payout?.amount);
        const remain = must - paid;

        const bhxhMust = toN(item.bhxhEmp);
        const bhxhPaid = 0;
        const bhxhRemain = bhxhMust - bhxhPaid;

        const bhytMust = toN(item.bhytEmp);
        const bhytPaid = 0;
        const bhytRemain = bhytMust - bhytPaid;

        const bhtnMust = toN(item.bhtnEmp);
        const bhtnPaid = 0;
        const bhtnRemain = bhtnMust - bhtnPaid;

        rows.push({
          dateVN: formatDateVN(payDate),
          docNo: `BP-${period.month}/${period.year}-${item.employeeId}`,
          desc:
            period.note ||
            `Lương ${item.employee?.fullName || ""} tháng ${
              period.month
            }/${period.year}`,
          wageMust: must,
          wagePaid: paid,
          wageRemain: remain,
          bhxhMust,
          bhxhPaid,
          bhxhRemain,
          bhytMust,
          bhytPaid,
          bhytRemain,
          bhtnMust,
          bhtnPaid,
          bhtnRemain,
        });
      }
    }

    const totals = rows.reduce(
      (acc, r) => {
        acc.wageMust += r.wageMust;
        acc.wagePaid += r.wagePaid;
        acc.wageRemain += r.wageRemain;

        acc.bhxhMust += r.bhxhMust;
        acc.bhxhPaid += r.bhxhPaid;
        acc.bhxhRemain += r.bhxhRemain;

        acc.bhytMust += r.bhytMust;
        acc.bhytPaid += r.bhytPaid;
        acc.bhytRemain += r.bhytRemain;

        acc.bhtnMust += r.bhtnMust;
        acc.bhtnPaid += r.bhtnPaid;
        acc.bhtnRemain += r.bhtnRemain;
        return acc;
      },
      {
        wageMust: 0,
        wagePaid: 0,
        wageRemain: 0,
        bhxhMust: 0,
        bhxhPaid: 0,
        bhxhRemain: 0,
        bhytMust: 0,
        bhytPaid: 0,
        bhytRemain: 0,
        bhtnMust: 0,
        bhtnPaid: 0,
        bhtnRemain: 0,
      }
    );

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/s5-hkd.ejs"),
      {
        year: y,
        businessName: user?.businessName || "HỘ / CÁ NHÂN KINH DOANH",
        address: user?.address || "",
        rows,
        totals,
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
      margin: { top: "10mm", bottom: "15mm", left: "10mm", right: "10mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="S5-HKD-${year}.pdf"`
    );
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi xuất PDF S5-HKD:", err);
    res.status(500).json({ error: "Không thể xuất PDF S5-HKD" });
  }
});

/* =====================================================
   DASHBOARD TỔNG HỢP
   ===================================================== */
router.get("/dashboard", async (req, res) => {
  try {
    const userId = req.user.id;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { start, end } = buildDateRange({ year, month });

    /* === DOANH THU THÁNG === */
    const revenueMonth = await prisma.receipt.aggregate({
      where: { createdBy: userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    /* === CHI PHÍ THÁNG (Phiếu chi + Lương phải trả) === */
    const expenseMonthRaw = await prisma.payment.aggregate({
      where: { createdBy: userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    const payrollThisMonth = await prisma.payrollItem.findMany({
      where: {
        period: { ownerId: userId, month, year },
      },
      include: { payout: true },
    });

    const payrollCostThisMonth = payrollThisMonth.reduce((sum, it) => {
      const paid = it.payout?.amount || 0;
      return sum + (toN(it.netPay) - paid);
    }, 0);

    const expenseMonth =
      toN(expenseMonthRaw._sum.amount) + payrollCostThisMonth;

    /* === TỒN QUỸ === */
    const totalReceipt = await prisma.receipt.aggregate({
      where: { createdBy: userId },
      _sum: { amount: true },
    });

    const totalPayment = await prisma.payment.aggregate({
      where: { createdBy: userId },
      _sum: { amount: true },
    });

    /* === THU/CHI HÔM NAY === */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayReceipt = await prisma.receipt.aggregate({
      where: { createdBy: userId, date: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
    });

    const todayPayment = await prisma.payment.aggregate({
      where: { createdBy: userId, date: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
    });

    /* === GIÁ TRỊ TỒN KHO === */
    const items = await prisma.inventoryItem.findMany({
      where: { createdBy: userId },
      select: { quantity: true, unitPriceIn: true },
    });

    const inventoryValue = items.reduce(
      (sum, it) => sum + it.quantity * it.unitPriceIn,
      0
    );

    /* === LƯƠNG PHẢI TRẢ (pendingPayroll) === */
    const payrollItems = await prisma.payrollItem.findMany({
      where: { period: { ownerId: userId } },
      include: { payout: true },
    });

    const pendingPayroll = payrollItems.reduce((sum, it) => {
      const paid = it.payout?.amount || 0;
      return sum + (toN(it.netPay) - paid);
    }, 0);

    /* === SỐ NHÂN VIÊN === */
    const employeesCount = await prisma.employee.count({
      where: { createdBy: userId, isActive: true },
    });

    /* === TRẢ JSON CHO FE === */
    res.json({
      revenueMonth: toN(revenueMonth._sum.amount),
      expenseMonth,
      profitMonth: toN(revenueMonth._sum.amount) - expenseMonth,
      cashBalance: toN(totalReceipt._sum.amount) - toN(totalPayment._sum.amount),

      todayIncome: toN(todayReceipt._sum.amount),
      todayExpense: toN(todayPayment._sum.amount),

      inventoryValue: toN(inventoryValue),
      pendingPayroll: toN(pendingPayroll),

      employeesCount,
    });

  } catch (err) {
    console.error("❌ Dashboard lỗi:", err);
    res.status(500).json({ error: "Không thể tải dashboard" });
  }
});


/* =====================================================
   DÒNG TIỀN 12 THÁNG
   ===================================================== */
router.get("/cashflow", async (req, res) => {
  try {
    const userId = req.user.id;
    const year = Number(req.query.year);

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const revenue = [];
    const expense = [];

    for (let m of months) {
      const { start, end } = buildDateRange({ year, month: m });

      const rv = await prisma.receipt.aggregate({
        where: { createdBy: userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      });

      const ex = await prisma.payment.aggregate({
        where: { createdBy: userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      });

      revenue.push(toN(rv._sum.amount));
      expense.push(toN(ex._sum.amount));
    }

    res.json({ months, revenue, expense });
  } catch (err) {
    console.error("❌ Cashflow lỗi:", err);
    res.status(500).json({ error: "Không thể tải dòng tiền" });
  }
});

/* =====================================================
   PHÂN BỔ CHI PHÍ THEO NHÓM (LƯƠNG + PHIẾU CHI)
   ===================================================== */
router.get("/expense-breakdown", async (req, res) => {
  try {
    const userId = req.user.id;
    const [year, month] = req.query.month.split("-").map(Number);

    const { start, end } = buildDateRange({ year, month });

    /* ==== 1) Lấy danh sách phiếu chi tháng ==== */
    const payments = await prisma.payment.findMany({
      where: { createdBy: userId, date: { gte: start, lt: end } },
    });

    /* ==== 2) Tính lương phải trả trong tháng ==== */
    const payrollThisMonth = await prisma.payrollItem.findMany({
      where: {
        period: { month, year, ownerId: userId }
      },
      include: { payout: true }
    });

    const payrollCost = payrollThisMonth.reduce((sum, it) => {
      const paid = it.payout?.amount || 0;
      return sum + (toN(it.netPay) - paid);
    }, 0);

    /* ==== 3) Gom nhóm chi phí ==== */
    const groups = {
      "Nhân công": payrollCost,
      "Điện nước": 0,
      "Chi phí khác": 0,
    };

    payments.forEach(p => {
      const r = (p.reason || "").toLowerCase();

      if (r.includes("lương")) {
        groups["Nhân công"] += toN(p.amount);
      } else if (r.includes("điện") || r.includes("nước")) {
        groups["Điện nước"] += toN(p.amount);
      } else {
        groups["Chi phí khác"] += toN(p.amount);
      }
    });

    res.json(
      Object.entries(groups).map(([label, value]) => ({ label, value }))
    );

  } catch (err) {
    console.error("❌ Expense breakdown lỗi:", err);
    res.status(500).json({ error: "Không thể tải dữ liệu chi phí" });
  }
});

/* =====================================================
   GIAO DỊCH GẦN NHẤT
   ===================================================== */
router.get("/recent-transactions", async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Number(req.query.limit || 8);

    const receipts = await prisma.receipt.findMany({
      where: { createdBy: userId },
      orderBy: { date: "desc" },
      take: limit,
    });

    const payments = await prisma.payment.findMany({
      where: { createdBy: userId },
      orderBy: { date: "desc" },
      take: limit,
    });

    let rows = [
      ...receipts.map((r) => ({
        id: r.id,
        type: "THU",
        description: r.reason,
        date: formatDateVN(r.date),
        amount: toN(r.amount),
        account: "S1",
      })),
      ...payments.map((p) => ({
        id: p.id,
        type: "CHI",
        description: p.reason,
        date: formatDateVN(p.date),
        amount: toN(p.amount),
        account: "S3",
      })),
    ];

    rows.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(rows.slice(0, limit));
  } catch (err) {
    console.error("❌ Recent transactions lỗi:", err);
    res.status(500).json({ error: "Không thể tải giao dịch" });
  }
});

/* =====================================================
   GIÁ TRỊ TỒN KHO
   ===================================================== */
router.get("/inventory-value", async (req, res) => {
  try {
    const userId = req.user.id;

    const items = await prisma.inventoryItem.findMany({
      where: { createdBy: userId },
      select: { quantity: true, unitPriceIn: true },
    });

    const total = items.reduce(
      (sum, it) => sum + it.quantity * it.unitPriceIn,
      0
    );

    res.json({ value: total });
  } catch (err) {
    console.error("❌ Lỗi inventory-value:", err);
    res.status(500).json({ error: "Không thể tính giá trị tồn kho" });
  }
});

/* =====================================================
   EXPORT ROUTER
   ===================================================== */
export default router;
