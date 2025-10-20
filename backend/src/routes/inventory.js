import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// =========================
// DANH SÁCH HÀNG HÓA
// =========================
router.get("/items", verifyToken, async (req, res) => {
  const items = await prisma.inventoryItem.findMany({
    where: { createdBy: req.user.id },
    orderBy: { name: "asc" },
  });
  res.json(items);
});

// =========================
// THÊM HÀNG HÓA
// =========================
router.post("/items", verifyToken, async (req, res) => {
  try {
    const { code, name, category, unit, unitPriceIn, unitPriceOut, note } = req.body;
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

// =========================
// XÓA / CẬP NHẬT HÀNG HÓA
// =========================
router.delete("/items/:id", verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: "Không tìm thấy hàng hóa" });

    await prisma.stockEntry.deleteMany({ where: { itemId: id } });
    await prisma.stockOut.deleteMany({ where: { itemId: id } });
    await prisma.inventoryItem.delete({ where: { id } });

    res.json({ message: "Đã xóa hàng hóa" });
  } catch (err) {
    console.error("❌ Lỗi khi xóa hàng hóa:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/items/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, category, unit, unitPriceIn, unitPriceOut, note } = req.body;
    const item = await prisma.inventoryItem.update({
      where: { id: Number(id) },
      data: { code, name, category, unit, unitPriceIn: Number(unitPriceIn) || 0, unitPriceOut: Number(unitPriceOut) || 0, note },
    });
    res.json(item);
  } catch (err) {
    console.error("❌ Lỗi cập nhật hàng hóa:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// NHẬP / XUẤT KHO
// =========================
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

router.post("/out", verifyToken, async (req, res) => {
  try {
    const { itemId, quantity, price, note } = req.body;
    const item = await prisma.inventoryItem.findUnique({ where: { id: Number(itemId) } });
    if (!item) return res.status(404).json({ error: "Không tìm thấy hàng hóa" });
    if (item.quantity < quantity) return res.status(400).json({ error: "Không đủ hàng tồn" });

    await prisma.inventoryItem.update({
      where: { id: Number(itemId) },
      data: { quantity: { decrement: Number(quantity) } },
    });

    await prisma.stockOut.create({
      data: { itemId: Number(itemId), quantity: Number(quantity), note, createdBy: req.user.id },
    });

    res.json({ message: "✅ Xuất kho thành công" });
  } catch (err) {
    console.error("❌ Lỗi xuất kho:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// TẠO PHIẾU NHẬP/XUẤT KHO (Voucher TT88)
// =======================
router.post("/voucher", verifyToken, async (req, res) => {
  try {
    const {
      type,              // "PNK" hoặc "PXK"
      voucherNo,         // nếu người dùng tự nhập, còn không hệ thống tự sinh
      supplier,
      receiver,
      reason,
      location,
      attachedDocs,
      totalAmount,
      businessName,
      address,
      items = [],
    } = req.body;

    // ==== Tạo mã phiếu tự động (PNK hoặc PXK) ====
    const prefix = type === "PXK" ? "PXK" : "PNK";
    const today = new Date();
    const dateCode = today.toISOString().split("T")[0].replace(/-/g, ""); // ví dụ 20251020

    // Đếm số phiếu trong ngày để sinh số thứ tự
    const count = await prisma.voucher.count({
      where: {
        type,
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lte: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });

    const newVoucherNo = `${prefix}${dateCode}-${String(count + 1).padStart(3, "0")}`;

    // ==== Tạo phiếu và các dòng chi tiết ====
    const voucher = await prisma.voucher.create({
      data: {
        type,
        voucherNo: voucherNo || newVoucherNo,
        supplier,
        receiver,
        reason,
        location,
        attachedDocs,
        totalAmount: Number(totalAmount) || 0,
        businessName,
        address,
        createdBy: req.user.id, // người lập phiếu
        items: {
          create: items.map((i) => ({
            name: i.name,
            code: i.code,
            unit: i.unit,
            qtyDocumented: Number(i.qtyDocumented || 0),
            qtyActual: Number(i.qtyActual || 0),
            unitPrice: Number(i.unitPrice || 0),
            amount: Number(i.amount || 0),
            inventoryItemId: i.itemId ? Number(i.itemId) : null, // 🔥 liên kết đúng hàng

          })),
        },
      },
      include: { items: true },
    });
    res.json(voucher);  

    // ==== Cập nhật tồn kho (inventoryItem.quantity) ====
    for (const i of items) {
  const qty = Number(i.qtyActual || 0);
  if (!qty || !i.itemId) continue;

  const item = await prisma.inventoryItem.findUnique({
    where: { id: Number(i.itemId) },
  });
  if (!item) continue;

  if (type === "PXK" && item.quantity < qty)
    throw new Error(`Không đủ tồn để xuất kho: ${item.name}`);

  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: {
      quantity: {
        [type === "PNK" ? "increment" : "decrement"]: qty,
      },
    },
  });
}


    res.json({
      message: "✅ Lưu phiếu thành công và đã cập nhật tồn kho",
      voucher,
    });
  } catch (err) {
    console.error("❌ Lỗi tạo phiếu:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// LẤY DANH SÁCH & CHI TIẾT PHIẾU
// =======================
router.get("/voucher", verifyToken, async (req, res) => {
  try {
    const vouchers = await prisma.voucher.findMany({
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(vouchers);
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách phiếu:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/voucher/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await prisma.voucher.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    });
    if (!voucher) return res.status(404).json({ error: "Không tìm thấy phiếu" });

    res.json({
      info: voucher,
      items: voucher.items,
    });
  } catch (err) {
    console.error("❌ Lỗi lấy phiếu:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// GHI NHẬN NGƯỜI XUẤT PDF
// =======================
router.patch("/voucher/:id/export", verifyToken, async (req, res) => {
  try {
    await prisma.voucher.update({
      where: { id: Number(req.params.id) },
      data: { exportedBy: req.user.id, exportedAt: new Date() },
    });
    res.json({ message: "✅ Đã ghi nhận người xuất phiếu" });
  } catch (err) {
    console.error("❌ Lỗi ghi nhận người xuất phiếu:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
