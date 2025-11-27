// backend/src/routes/inventory.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

router.use(verifyToken);

/* ===================================================================
   1) DANH SÁCH HÀNG HÓA — chỉ thấy hàng do chính user tạo
=================================================================== */
router.get("/items", async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { createdBy: req.user.id },
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch (err) {
    console.error("❌ GET /items:", err);
    res.status(500).json({ error: "Không thể tải hàng hóa" });
  }
});

/* ===================================================================
   2) THÊM HÀNG HÓA — Validate đủ, tránh trùng code + name trong user
=================================================================== */
router.post("/items", async (req, res) => {
  try {
    const { code, name, category, unit, unitPriceIn, unitPriceOut, note } =
      req.body;

    if (!code?.trim()) return res.status(400).json({ error: "Mã hàng là bắt buộc" });
    if (!name?.trim()) return res.status(400).json({ error: "Tên hàng là bắt buộc" });
    if (!unit?.trim()) return res.status(400).json({ error: "Đơn vị tính là bắt buộc" });

    const inPrice = Number(unitPriceIn);
    const outPrice = Number(unitPriceOut);

    if (isNaN(inPrice) || inPrice < 0)
      return res.status(400).json({ error: "Đơn giá nhập phải >= 0" });

    if (isNaN(outPrice) || outPrice < 0)
      return res.status(400).json({ error: "Đơn giá xuất phải >= 0" });

    // Không cho trùng CODE trong cùng user
    const existsCode = await prisma.inventoryItem.findFirst({
      where: { code, createdBy: req.user.id },
    });
    if (existsCode) return res.status(400).json({ error: "Mã hàng đã tồn tại" });

    // Không cho trùng NAME trong cùng user
    const existsName = await prisma.inventoryItem.findFirst({
      where: { name, createdBy: req.user.id },
    });
    if (existsName) return res.status(400).json({ error: "Tên hàng đã tồn tại" });

    const item = await prisma.inventoryItem.create({
      data: {
        code,
        name,
        category,
        unit,
        unitPriceIn: inPrice,
        unitPriceOut: outPrice,
        note,
        quantity: 0,
        createdBy: req.user.id,
      },
    });

    res.json(item);
  } catch (err) {
    console.error("❌ POST /items:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===================================================================
   3) CẬP NHẬT HÀNG HÓA — không cho sửa sang mã trùng
=================================================================== */
router.put("/items/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existing || existing.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy hàng hóa" });

    const { code, name, category, unit, unitPriceIn, unitPriceOut, note } =
      req.body;

    // Chặn trùng code
    if (code) {
      const check = await prisma.inventoryItem.findFirst({
        where: {
          code,
          createdBy: req.user.id,
          NOT: { id },
        },
      });
      if (check) return res.status(400).json({ error: "Mã hàng đã tồn tại" });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        code,
        name,
        category,
        unit,
        unitPriceIn: Number(unitPriceIn),
        unitPriceOut: Number(unitPriceOut),
        note,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ PUT /items:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===================================================================
   4) XÓA HÀNG HÓA — tự động xóa transaction liên quan
=================================================================== */
router.delete("/items/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item || item.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy hàng hóa" });

    await prisma.$transaction([
      prisma.inventoryTxn.deleteMany({ where: { itemId: id } }),
      prisma.inventoryItem.delete({ where: { id } }),
    ]);

    res.json({ message: "Đã xóa hàng hóa" });
  } catch (err) {
    console.error("❌ DELETE /items:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===================================================================
   5) SINH SỐ PHIẾU TT88 — chống trùng, theo từng user
=================================================================== */
async function generateVoucherNo(type, userId) {
  const prefix = type === "PXK" ? "PXK" : "PNK";

  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const count = await prisma.voucher.count({
    where: {
      type,
      createdBy: userId,
      createdAt: { gte: startDay, lte: endDay },
    },
  });

  const dateCode = now.toISOString().split("T")[0].replace(/-/g, "");

  return `${prefix}${dateCode}-${String(count + 1).padStart(3, "0")}`;
}

/* ===================================================================
   6) LƯU PHIẾU NHẬP / XUẤT KHO + GHI NHẬT KÝ
=================================================================== */
router.post("/voucher", async (req, res) => {
  try {
    const {
      type,
      voucherNo,
      supplier,
      receiver,
      reason,
      location,
      attachedDocs,
      businessName,
      address,
      items = [],
      totalAmount,
    } = req.body;

    if (!businessName?.trim()) return res.status(400).json({ error: "Tên hộ kinh doanh là bắt buộc" });
    if (!address?.trim()) return res.status(400).json({ error: "Địa chỉ là bắt buộc" });
    if (!location?.trim()) return res.status(400).json({ error: "Địa điểm nhập/xuất là bắt buộc" });
    if (!items.length) return res.status(400).json({ error: "Danh sách hàng không được trống" });

    // Sinh số phiếu auto nếu FE không gửi
    const autoVoucherNo = await generateVoucherNo(type, req.user.id);
    const useVoucherNo = voucherNo?.trim() || autoVoucherNo;

    const created = await prisma.$transaction(async (tx) => {
      // Tạo voucher
      const v = await tx.voucher.create({
        data: {
          type,
          voucherNo: useVoucherNo,
          supplier,
          receiver,
          reason,
          location,
          attachedDocs,
          businessName,
          address,
          totalAmount: Number(totalAmount) || 0,
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

      // Cập nhật tồn kho + nhật ký
      for (const i of items) {
        if (!i.itemId) continue;

        const qty = Number(i.qtyActual || 0);
        if (qty <= 0) continue;

        const item = await tx.inventoryItem.findUnique({
          where: { id: Number(i.itemId) },
        });

        if (!item || item.createdBy !== req.user.id)
          throw new Error(`Hàng hóa không thuộc tài khoản của bạn`);

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

        await tx.inventoryTxn.create({
          data: {
            itemId: item.id,
            type: type === "PNK" ? "IN" : "OUT",
            quantity: qty,
            unitPrice: Number(i.unitPrice || 0),
            refVoucherId: v.id,
            createdBy: req.user.id,
          },
        });
      }

      return v;
    });

    res.json({
      message: "Lưu phiếu thành công",
      voucher: created,
      id: created.id,
    });
  } catch (err) {
    console.error("❌ POST /voucher:", err);

    if (err.code === "P2002")
      return res.status(400).json({ error: "Số phiếu đã tồn tại, vui lòng lưu lại lần nữa" });

    res.status(500).json({ error: err.message });
  }
});

/* ===================================================================
   7) DANH SÁCH PHIẾU (chỉ hiển thị của user)
=================================================================== */
router.get("/voucher", async (req, res) => {
  try {
    const list = await prisma.voucher.findMany({
      where: { createdBy: req.user.id }, // CHẶN LỘ PHIẾU
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(list);
  } catch (err) {
    console.error("❌ GET /voucher:", err);
    res.status(500).json({ error: "Không thể tải danh sách phiếu" });
  }
});

/* ===================================================================
   8) CHI TIẾT PHIẾU — chỉ user tạo mới xem được
=================================================================== */
router.get("/voucher/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!voucher || voucher.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy phiếu" });

    res.json(voucher);
  } catch (err) {
    console.error("❌ GET /voucher/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===================================================================
   9) NHẬT KÝ KHO — chỉ của user
=================================================================== */
router.get("/history", async (req, res) => {
  try {
    const logs = await prisma.inventoryTxn.findMany({
      where: { createdBy: req.user.id },
      include: {
        item: {
          select: { id: true, name: true, code: true, unit: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(logs);
  } catch (err) {
    console.error("❌ GET /history:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
