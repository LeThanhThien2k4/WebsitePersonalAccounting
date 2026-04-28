// backend/src/routes/payroll.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

router.use(verifyToken);

/* ================= Helpers ================= */
const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "object" && typeof v.toNumber === "function") return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const roundStep = (val, step = 1000) => Math.round(toNum(val) / step) * step;
const endOfMonth = (y, m) => new Date(y, m, 0);

async function pickEffectiveRate(period) {
  const eom = endOfMonth(period.year, period.month);
  return prisma.payrollRate.findFirst({
    where: { active: true, effectiveFrom: { lte: eom } },
    orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
  });
}

/* ================= PIT Calculator ================= */
function calcPIT(taxBase) {
  if (taxBase <= 0) return 0;
  if (taxBase <= 5000000) return taxBase * 0.05;
  if (taxBase <= 10000000) return 250000 + (taxBase - 5000000) * 0.10;
  if (taxBase <= 18000000) return 750000 + (taxBase - 10000000) * 0.15;
  if (taxBase <= 32000000) return 1950000 + (taxBase - 18000000) * 0.20;
  if (taxBase <= 52000000) return 4750000 + (taxBase - 32000000) * 0.25;
  if (taxBase <= 80000000) return 9750000 + (taxBase - 52000000) * 0.30;
  return 18150000 + (taxBase - 80000000) * 0.35;
}

/* ================= Main Payroll Computation ================= */
function computeLine({
  salaryBase = 0,
  daysWorked = 0,
  otHours = 0,
  allowances = 0,
  bonus = 0,
  otherIncome = 0,
  benefitOther = 0,
  deductUnpaid = 0,
  advance = 0,
  workDaysInMonth = 26,
  otMultiplier = 1.5,
  dependents = 0,
  rate,
  step = 1000,
}) {
  const base = toNum(salaryBase);
  const wd = toNum(daysWorked);
  const ot = toNum(otHours);

  const basePart = base * (wd / workDaysInMonth);
  const otPart = (base / workDaysInMonth / 8) * ot * otMultiplier;

  const grossBeforeDeduct =
    basePart +
    otPart +
    toNum(allowances) +
    toNum(bonus) +
    toNum(otherIncome) +
    toNum(benefitOther);

  // Trần - sàn đóng BHXH
  const floor = toNum(rate.salaryFloor);
  const ceil = toNum(rate.salaryCeiling);
  const baseContrib = Math.min(Math.max(base, floor || 0), ceil || base);

  // BHXH/BHYT/BHTN/CĐ phí (phần NLĐ)
  const bhxhEmp = (baseContrib * toNum(rate.bhxhEmp)) / 100;
  const bhytEmp = (baseContrib * toNum(rate.bhytEmp)) / 100;
  const bhtnEmp = (baseContrib * toNum(rate.bhtnEmp)) / 100;
  const unionEmp = (baseContrib * toNum(rate.unionEmp)) / 100;

  const taxableIncome = grossBeforeDeduct - (bhxhEmp + bhytEmp + bhtnEmp + unionEmp);
  const taxBase = Math.max(0, taxableIncome - 11000000 - dependents * 4400000);
  const taxTncn = calcPIT(taxBase);

  const totalDeduct =
    bhxhEmp + bhytEmp + bhtnEmp + unionEmp + taxTncn + toNum(advance) + toNum(deductUnpaid);

  const gross = grossBeforeDeduct;
  const netPay = grossBeforeDeduct - totalDeduct;

  return {
    grossBeforeDeduct: roundStep(grossBeforeDeduct, step),
    bhxhEmp: roundStep(bhxhEmp, step),
    bhytEmp: roundStep(bhytEmp, step),
    bhtnEmp: roundStep(bhtnEmp, step),
    unionEmp: roundStep(unionEmp, step),
    taxTncn: roundStep(taxTncn, step),
    gross: roundStep(gross, step),
    netPay: roundStep(netPay, step),
  };
}

/* ================= Payroll Period APIs ================= */
router.post("/periods", async (req, res) => {
  try {
    const { month, year, note } = req.body;
    const ownerId = req.user.id;

    const exists = await prisma.payrollPeriod.findFirst({ where: { ownerId, month, year } });
    if (exists)
      return res.json({ id: exists.id, existed: true, message: "Kỳ đã tồn tại" });

    const period = await prisma.payrollPeriod.create({ data: { month, year, note, ownerId } });
    res.json({ ...period, existed: false });
  } catch (e) {
    console.error("❌ Lỗi tạo kỳ:", e);
    res.status(400).json({ error: e.message });
  }
});

router.get("/periods", async (req, res) => {
  const ownerId = req.user.id;
  const list = await prisma.payrollPeriod.findMany({
    where: { ownerId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  res.json(list);
});

router.get("/periods/:id", async (req, res) => {
  const id = +req.params.id;
  const ownerId = req.user.id;

  const p = await prisma.payrollPeriod.findFirst({
    where: { id, ownerId },
    include: {
      items: { include: { employee: true }, orderBy: { employeeId: "asc" } },
      rates: true,
    },
  });

  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

/* ========== Import employees ========== */
router.post("/periods/:id/import", async (req, res) => {
  const id = +req.params.id;
  const ownerId = req.user.id;
  const { employeeIds } = req.body;

  const period = await prisma.payrollPeriod.findFirst({ where: { id, ownerId } });
  if (!period) return res.status(404).json({ error: "Period not found" });
  if (period.status !== "DRAFT") return res.status(400).json({ error: "Only DRAFT" });

  const where = employeeIds?.length
    ? { id: { in: employeeIds }, isActive: true }
    : { isActive: true, createdBy: ownerId };

  const emps = await prisma.employee.findMany({ where });

  const txs = emps.map((e) =>
    prisma.payrollItem.upsert({
      where: { periodId_employeeId: { periodId: id, employeeId: e.id } },
      update: {},
      create: {
        periodId: id,
        employeeId: e.id,
        salaryBase: e.baseSalary,
        daysWorked: 0,
        otHours: 0,
        allowances: 0,
        benefitOther: 0,
        bonus: 0,
        otherIncome: 0,
        deductUnpaid: 0,
        advance: 0,
        bhxhEmp: 0,
        bhytEmp: 0,
        bhtnEmp: 0,
        unionEmp: 0,
        taxTncn: 0,
        grossBeforeDeduct: 0,
        gross: 0,
        netPay: 0,
      },
    })
  );

  await prisma.$transaction(txs);
  res.json({ imported: emps.length });
});

/* ========== Update PayrollItem ========== */
router.patch("/items/:id", async (req, res) => {
  const id = +req.params.id;
  const ownerId = req.user.id;

  const item = await prisma.payrollItem.findUnique({
    where: { id },
    include: { period: true },
  });
  if (!item) return res.status(404).json({ error: "Item not found" });
  const period = item.period;

  if (!period || period.ownerId !== ownerId) return res.status(403).json({ error: "Forbidden" });
  if (period.status === "LOCKED") return res.status(400).json({ error: "Locked period" });

  const allowed = [
    "salaryBase",
    "daysWorked",
    "otHours",
    "allowances",
    "bonus",
    "otherIncome",
    "benefitOther",
    "deductUnpaid",
    "advance",
    "note",
  ];
  const data = {};
  for (const k of allowed) if (k in req.body) data[k] = req.body[k];

  const upd = await prisma.payrollItem.update({ where: { id }, data });
  res.json(upd);
});

/* ========== Calculate Payroll ========== */
router.post("/periods/:id/calc", async (req, res) => {
  try {
    const id = +req.params.id;
    const ownerId = req.user.id;
    const { workDaysInMonth = 26, otMultiplier = 1.5, roundTo = 1000 } = req.body || {};

    const period = await prisma.payrollPeriod.findFirst({
      where: { id, ownerId },
      include: { items: true },
    });
    if (!period) return res.status(404).json({ error: "Period not found" });
    if (!period.items.length) return res.status(400).json({ error: "No items" });

    const rate = await pickEffectiveRate(period);
    if (!rate) return res.status(400).json({ error: "No PayrollRate" });

    await prisma.$transaction(async (tx) => {
      for (const it of period.items) {
        const c = computeLine({ ...it, workDaysInMonth, otMultiplier, rate, step: roundTo });

        await tx.payrollItem.update({
          where: { id: it.id },
          data: { ...c },
        });
      }
      if (period.status === "DRAFT") {
        await tx.payrollPeriod.update({ where: { id }, data: { status: "CALCULATED" } });
      }
    });

    res.json({ message: "Payroll calculated successfully" });
  } catch (e) {
    console.error("❌ Calc error:", e);
    res.status(400).json({ error: e.message || "Calc failed" });
  }
});

/* ========== Lock / Unlock ========== */
router.patch("/periods/:id/lock", async (req, res) => {
  const id = +req.params.id;
  const ownerId = req.user.id;

  const p = await prisma.payrollPeriod.findFirst({ where: { id, ownerId }, include: { items: true } });
  if (!p) return res.status(404).json({ error: "Period not found" });
  if (!p.items.length) return res.status(400).json({ error: "No items" });
  if (p.status !== "CALCULATED") return res.status(400).json({ error: "Calculate first" });

  const upd = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: "LOCKED", lockedAt: new Date() },
  });
  res.json({ status: upd.status, lockedAt: upd.lockedAt });
});

router.patch("/periods/:id/unlock", async (req, res) => {
  const id = +req.params.id;
  const ownerId = req.user.id;

  const p = await prisma.payrollPeriod.findFirst({ where: { id, ownerId } });
  if (!p) return res.status(404).json({ error: "Period not found" });
  if (p.status !== "LOCKED") return res.status(400).json({ error: "Only locked period can be unlocked" });

  const upd = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: "CALCULATED", lockedAt: null },
  });

  res.json({ status: upd.status, message: "Kỳ đã được mở khóa để chỉnh sửa" });
});

/* ========== Print 05-LĐTL ========== */
router.get("/periods/:id/print-05", async (req, res) => {
  const id = +req.params.id;
  const ownerId = req.user.id;

  const period = await prisma.payrollPeriod.findFirst({
    where: { id, ownerId },
    include: {
      owner: true,
      items: { include: { employee: true }, orderBy: { id: "asc" } },
    },
  });
  if (!period) return res.status(404).json({ error: "Period not found" });

  const rows = period.items.map((it, idx) => ({
    stt: idx + 1,
    employeeCode: it.employee?.code ?? "",
    employeeName: it.employee?.fullName ?? "",
    position: it.employee?.position ?? "",
    salaryBase: toNum(it.salaryBase),
    daysWorked: toNum(it.daysWorked),
    otHours: toNum(it.otHours),
    allowances: toNum(it.allowances),
    bonus: toNum(it.bonus),
    otherIncome: toNum(it.otherIncome),
    benefitOther: toNum(it.benefitOther),
    deductUnpaid: toNum(it.deductUnpaid),
    advance: toNum(it.advance),
    bhxhEmp: toNum(it.bhxhEmp),
    bhytEmp: toNum(it.bhytEmp),
    bhtnEmp: toNum(it.bhtnEmp),
    unionEmp: toNum(it.unionEmp),
    taxTncn: toNum(it.taxTncn),
    gross: toNum(it.gross),
    netPay: toNum(it.netPay),
  }));

  const totals = rows.reduce(
    (a, r) => {
      a.gross += r.gross;
      a.netPay += r.netPay;
      return a;
    },
    { gross: 0, netPay: 0 }
  );

  res.json({
    form: "05-LĐTL",
    period: { month: period.month, year: period.year, status: period.status },
    business: {
      name: period.owner?.businessName ?? "",
      address: period.owner?.address ?? "",
      taxCode: period.owner?.taxCode ?? "",
      bankAccount: period.owner?.bankAccount ?? "",
      bankName: period.owner?.bankName ?? "",
      phone: period.owner?.phone ?? "",
    },
    rows,
    totals,
    generatedAt: new Date(),
  });
});
/* ========== DELETE PERIOD (DRAFT ONLY) ========== */

router.delete("/periods/:id", async (req, res) => {
  try {
    const id = +req.params.id;
    const ownerId = req.user.id;

    const period = await prisma.payrollPeriod.findFirst({
      where: { id, ownerId },
    });

    if (!period)
      return res.status(404).json({ error: "Period not found" });

    if (period.status !== "DRAFT")
      return res.status(400).json({ error: "Chỉ được xóa kỳ ở trạng thái DRAFT" });

    // Xóa payrollItem trước
    await prisma.payrollItem.deleteMany({ where: { periodId: id } });

    // Xóa kỳ lương
    await prisma.payrollPeriod.delete({ where: { id } });

    res.json({ message: "Đã xóa kỳ lương" });
  } catch (err) {
    console.error("❌ Lỗi xóa kỳ:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
