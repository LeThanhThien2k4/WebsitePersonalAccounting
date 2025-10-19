import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// =========================
// Danh sách hàng hóa
// =========================
router.get("/items", verifyToken, async (req, res) => {
  const items = await prisma.inventoryItem.findMany({
    where: { createdBy: req.user.id },
    orderBy: { name: "asc" },
  });
  res.json(items);
});

// =========================
// Thêm hàng hóa mới
// =========================
router.post("/items", verifyToken, async (req, res) => {
  try {
    const { code, name, category, unit, unitPriceIn, unitPriceOut, note } = req.body;

    // Kiểm tra trùng tên trong kho của user
    const exist = await prisma.inventoryItem.findFirst({
      where: { name, createdBy: req.user.id },
    });
    if (exist) return res.status(400).json({ error: "Sản phẩm đã tồn tại" });

    const item = await prisma.inventoryItem.create({
      data: {
        code,
        name,
        category,
        unit,
        unitPriceIn: Number(unitPriceIn) || 0,
        unitPriceOut: Number(unitPriceOut) || 0,
        note,
        quantity: 0,
        createdBy: req.user.id,
      },
    });

    res.json(item);
  } catch (err) {
    console.error("❌ Lỗi thêm hàng hóa:", err);
    res.status(500).json({ error: err.message });
  }
});

// Xóa hàng hóa
router.delete("/items/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem hàng có thuộc user hiện tại không
    const item = await prisma.inventoryItem.findUnique({
      where: { id: Number(id) },
    });

    if (!item) return res.status(404).json({ error: "Không tìm thấy hàng hóa" });

    // Xóa tất cả bản ghi liên quan trước (nếu có)
    await prisma.stockEntry.deleteMany({ where: { itemId: Number(id) } });
    await prisma.stockOut.deleteMany({ where: { itemId: Number(id) } });

    // Xóa hàng hóa
    await prisma.inventoryItem.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Đã xóa hàng hóa" });
  } catch (err) {
    console.error("❌ Lỗi khi xóa hàng hóa:", err);
    res.status(500).json({ error: err.message });
  }
});
// =========================
// Cập nhật hàng hóa
// =========================
router.put("/items/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, category, unit, unitPriceIn, unitPriceOut, note } = req.body;

    // Cập nhật thông tin hàng hóa
    const item = await prisma.inventoryItem.update({
      where: { id: Number(id) },
      data: {
        code,
        name,
        category,
        unit,
        unitPriceIn: Number(unitPriceIn) || 0,
        unitPriceOut: Number(unitPriceOut) || 0,
        note,
      },
    });

    res.json(item);
  } catch (err) {
    console.error("❌ Lỗi cập nhật hàng hóa:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Nhập kho
// =======================
router.post("/in", verifyToken, async (req, res) => {
  try {
    const { itemId, quantity, price, note } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id: Number(itemId) },
      data: { quantity: { increment: Number(quantity) } },
    });

    await prisma.stockEntry.create({
      data: {
        itemId: Number(itemId),
        quantity: Number(quantity),
        unitPrice: Number(price) || item.unitPriceIn || 0,
        total: Number(quantity) * (Number(price) || item.unitPriceIn || 0),
        note,
        createdBy: req.user.id,
      },
    });

    res.json({ message: "✅ Nhập kho thành công", item });
  } catch (err) {
    console.error("❌ Lỗi nhập kho:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Xuất kho
// =======================
router.post("/out", verifyToken, async (req, res) => {
  try {
    const { itemId, quantity, price, note } = req.body;

    const item = await prisma.inventoryItem.findUnique({
      where: { id: Number(itemId) },
    });
    if (!item) return res.status(404).json({ error: "Không tìm thấy hàng hóa" });
    if (item.quantity < quantity)
      return res.status(400).json({ error: "Không đủ hàng tồn để xuất kho" });

    await prisma.inventoryItem.update({
      where: { id: Number(itemId) },
      data: { quantity: { decrement: Number(quantity) } },
    });

    await prisma.stockOut.create({
      data: {
        itemId: Number(itemId),
        quantity: Number(quantity),
        note,
        createdBy: req.user.id,
      },
    });

    res.json({ message: "✅ Xuất kho thành công" });
  } catch (err) {
    console.error("❌ Lỗi xuất kho:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
