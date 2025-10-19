import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// =======================
// Phiếu thu (01-TT)
// =======================
router.post("/receipts", verifyToken, async (req, res) => {
  try {
    const data = await prisma.receipt.create({
      data: {
        date: new Date(req.body.date),
        payer: req.body.payer,
        reason: req.body.reason,
        amount: Number(req.body.amount),
        method: req.body.method,
        createdBy: req.user.id,
      },
    });
    res.json(data);
  } catch (err) {
    console.error("❌ Lỗi tạo phiếu thu:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/receipts", verifyToken, async (_req, res) => {
  const list = await prisma.receipt.findMany({
    where: { createdBy: _req.user.id },
    orderBy: { date: "desc" },
    include: { user: true },
  });
  res.json(list);
});

// =======================
// Phiếu chi (02-TT)
// =======================
router.post("/payments", verifyToken, async (req, res) => {
  try {
    const data = await prisma.payment.create({
      data: {
        date: new Date(req.body.date),
        payee: req.body.payee,
        reason: req.body.reason,
        amount: Number(req.body.amount),
        method: req.body.method,
        createdBy: req.user.id,
      },
    });
    res.json(data);
  } catch (err) {
    console.error("❌ Lỗi tạo phiếu chi:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/payments", verifyToken, async (_req, res) => {
  const list = await prisma.payment.findMany({
    where: { createdBy: _req.user.id },
    orderBy: { date: "desc" },
    include: { user: true },
  });
  res.json(list);
});

// =======================
// Nhập kho (03-VT)
// =======================
router.post("/inventory/in", verifyToken, async (req, res) => {
  try {
    const data = await prisma.inventoryIn.create({
      data: {
        date: new Date(req.body.date),
        item: req.body.item,
        qty: Number(req.body.qty),
        price: Number(req.body.price),
        total: Number(req.body.total),
        createdBy: req.user.id, // ✅ thêm dòng này
      },
    });
    res.json(data);
  } catch (err) {
    console.error("❌ Lỗi nhập kho:", err);
    res.status(500).json({ error: err.message });
  }
});


// =======================
// Xuất kho (04-VT)
// =======================
router.post("/inventory/out", verifyToken, async (req, res) => {
  try {
    const data = await prisma.inventoryOut.create({
      data: {
        date: new Date(req.body.date),
        item: req.body.item,
        qty: Number(req.body.qty),
        price: Number(req.body.price),
        total: Number(req.body.total),
        createdBy: req.user.id, // ✅ thêm dòng này
      },
    });
    res.json(data);
  } catch (err) {
    console.error("❌ Lỗi xuất kho:", err);
    res.status(500).json({ error: err.message });
  }
});


// =======================
// Bảng lương (05-LĐTL)
// =======================
router.post("/payrolls", verifyToken, async (req, res) => {
  try {
    const data = await prisma.payroll.create({
      data: {
        period: req.body.period,
        employees: req.body.employees,
        total: Number(req.body.total),
        createdBy: req.user.id,
      },
    });
    res.json(data);
  } catch (err) {
    console.error("❌ Lỗi tạo bảng lương:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/payrolls", verifyToken, async (_req, res) => {
  const list = await prisma.payroll.findMany({
    where: { createdBy: _req.user.id },
    orderBy: { period: "desc" },
    include: { user: true },
  });
  res.json(list);
});

export default router;
