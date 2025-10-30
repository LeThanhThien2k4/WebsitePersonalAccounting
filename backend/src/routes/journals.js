// backend/src/routes/journals.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

router.use(verifyToken);

// =======================
// Phiếu thu (01-TT)
// =======================
router.post("/receipts", async (req, res) => {
  try {
    const data = await prisma.receipt.create({
      data: {
        date: new Date(req.body.date),
        payer: req.body.payer,
        reason: req.body.reason ?? null,
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

router.get("/receipts", async (req, res) => {
  const list = await prisma.receipt.findMany({
    where: { createdBy: req.user.id },
    orderBy: { date: "desc" },
    include: { user: true },
  });
  res.json(list);
});
// Xóa phiếu thu
router.delete("/receipts/:id", async (req, res) => {
  try {
    await prisma.receipt.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Không thể xóa phiếu thu" });
  }
});

// =======================
// Phiếu chi (02-TT)
// =======================
router.post("/payments", async (req, res) => {
  try {
    const data = await prisma.payment.create({
      data: {
        date: new Date(req.body.date),
        payee: req.body.payee,
        reason: req.body.reason ?? null,
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

router.get("/payments", async (req, res) => {
  const list = await prisma.payment.findMany({
    where: { createdBy: req.user.id },
    orderBy: { date: "desc" },
    include: { user: true },
  });
  res.json(list);
});
// Xóa phiếu chi
router.delete("/payments/:id", async (req, res) => {
  try {
    await prisma.payment.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Không thể xóa phiếu chi" });
  }
});
// =======================
// Nhập kho / Xuất kho (03–VT / 04–VT)
// Dùng InventoryItem + InventoryTxn
// Body đề xuất: { itemId, qty, unitPrice }
// =======================

// Nhập kho
router.post("/inventory/in", async (req, res) => {
  try {
    const { itemId, itemCode, qty, unitPrice } = req.body;
    if (!itemId && !itemCode) return res.status(400).json({ error: "Thiếu itemId hoặc itemCode" });

    const item =
      itemId
        ? await prisma.inventoryItem.findUnique({ where: { id: Number(itemId) } })
        : await prisma.inventoryItem.findUnique({ where: { code: String(itemCode) } });

    if (!item || item.createdBy !== req.user.id)
      return res.status(404).json({ error: "Hàng hóa không tồn tại" });

    const nQty = Number(qty || 0);
    const nPrice = unitPrice != null ? Number(unitPrice) : null;

    const tx = await prisma.$transaction(async (txp) => {
      const updated = await txp.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: { increment: nQty },
          unitPriceIn: nPrice ?? item.unitPriceIn,
        },
      });

      const txn = await txp.inventoryTxn.create({
        data: {
          itemId: item.id,
          type: "IN",
          quantity: nQty,
          unitPrice: nPrice,
          createdBy: req.user.id,
        },
      });

      return { updated, txn };
    });

    res.json(tx);
  } catch (err) {
    console.error("❌ Lỗi nhập kho:", err);
    res.status(500).json({ error: err.message });
  }
});

// Xuất kho
router.post("/inventory/out", async (req, res) => {
  try {
    const { itemId, itemCode, qty, unitPrice } = req.body;
    if (!itemId && !itemCode) return res.status(400).json({ error: "Thiếu itemId hoặc itemCode" });

    const item =
      itemId
        ? await prisma.inventoryItem.findUnique({ where: { id: Number(itemId) } })
        : await prisma.inventoryItem.findUnique({ where: { code: String(itemCode) } });

    if (!item || item.createdBy !== req.user.id)
      return res.status(404).json({ error: "Hàng hóa không tồn tại" });

    const nQty = Number(qty || 0);
    if (item.quantity < nQty) return res.status(400).json({ error: "Tồn kho không đủ" });

    const nPrice = unitPrice != null ? Number(unitPrice) : item.unitPriceOut ?? null;

    const tx = await prisma.$transaction(async (txp) => {
      const updated = await txp.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: { decrement: nQty },
          // không bắt buộc cập nhật đơn giá xuất
        },
      });

      const txn = await txp.inventoryTxn.create({
        data: {
          itemId: item.id,
          type: "OUT",
          quantity: nQty,
          unitPrice: nPrice,
          createdBy: req.user.id,
        },
      });

      return { updated, txn };
    });

    res.json(tx);
  } catch (err) {
    console.error("❌ Lỗi xuất kho:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Lịch sử giao dịch kho (tùy chọn)
// =======================
router.get("/inventory/transactions", async (req, res) => {
  const { itemId } = req.query;
  const where = itemId
    ? { itemId: Number(itemId) }
    : { InventoryItem: { createdBy: req.user.id } };

  const list = await prisma.inventoryTxn.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { InventoryItem: true },
  });
  res.json(list);
});

export default router;
