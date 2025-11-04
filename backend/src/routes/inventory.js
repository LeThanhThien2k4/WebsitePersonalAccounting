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
// TẠO PHIẾU NHẬP/XUẤT KHO (Voucher TT88) + GHI NHẬT KÝ
// =======================
router.post("/voucher", verifyToken, async (req, res) => {
  try {
    const {
      type, // "PNK" hoặc "PXK"
      voucherNo,
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

    const prefix = type === "PXK" ? "PXK" : "PNK";
    const today = new Date();
    const dateCode = today.toISOString().split("T")[0].replace(/-/g, "");
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

    // ======= Gói toàn bộ trong transaction =======
    const voucher = await prisma.$transaction(async (tx) => {
      // 1. Tạo phiếu và các dòng hàng
      const createdVoucher = await tx.voucher.create({
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
          createdBy: req.user.id,
          items: {
            create: items.map((i) => ({
              name: i.name,
              code: i.code,
              unit: i.unit,
              qtyDocumented: Number(i.qtyDocumented || 0),
              qtyActual: Number(i.qtyActual || 0),
              unitPrice: Number(i.unitPrice || 0),
              amount: Number(i.amount || 0),
              inventoryItemId: i.itemId ? Number(i.itemId) : null,
            })),
          },
        },
        include: { items: true },
      });

      // 2. Cập nhật tồn kho + ghi nhật ký
      for (const i of items) {
        const qty = Number(i.qtyActual || 0);
        if (!qty || !i.itemId) continue;

        const item = await tx.inventoryItem.findUnique({
          where: { id: Number(i.itemId) },
        });
        if (!item) continue;

        if (type === "PXK" && item.quantity < qty)
          throw new Error(`Không đủ tồn để xuất kho: ${item.name}`);

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            quantity: {
              [type === "PNK" ? "increment" : "decrement"]: qty,
            },
          },
        });

        // === Ghi nhật ký phát sinh ===
        await tx.inventoryTxn.create({
          data: {
            itemId: Number(i.itemId),
            type: type === "PXK" ? "OUT" : "IN",
            quantity: qty,
            unitPrice: Number(i.unitPrice || 0),
            refVoucherId: createdVoucher.id,
            createdBy: req.user.id,
          },
        });
      }

      return createdVoucher;
    });

    res.json({
      message: "✅ Lưu phiếu thành công, đã cập nhật tồn kho & nhật ký",
      id: voucher.id,       // ✅ thêm dòng này
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
// NHẬT KÝ KHO (xem toàn bộ)
// =======================
router.get("/history", verifyToken, async (req, res) => {
  try {
    const history = await prisma.inventoryTxn.findMany({
      where: { createdBy: req.user.id },
      include: {
        item: {
          select: { id: true, code: true, name: true, unit: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(history);
  } catch (err) {
    console.error("❌ Lỗi tải nhật ký kho:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
