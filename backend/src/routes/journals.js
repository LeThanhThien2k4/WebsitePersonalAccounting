// backend/src/routes/journals.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

router.use(verifyToken);

const ALLOWED_METHODS = ["cash", "bank"];

function parseDate(input) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseAmount(input) {
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  return n;
}

/* =======================
 * Phiếu thu (01-TT)
 * =======================
 */
router.post("/receipts", async (req, res) => {
  try {
    const { date, payer, reason, amount, method } = req.body;

    const d = parseDate(date);
    if (!d) {
      return res.status(400).json({ error: "Ngày không hợp lệ" });
    }

    if (!payer || !String(payer).trim()) {
      return res.status(400).json({ error: "Người nộp là bắt buộc" });
    }

    const a = parseAmount(amount);
    if (a === null || a <= 0) {
      return res.status(400).json({ error: "Số tiền phải lớn hơn 0" });
    }

    if (!ALLOWED_METHODS.includes(method)) {
      return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ" });
    }

    const data = await prisma.receipt.create({
      data: {
        date: d,
        payer: String(payer).trim(),
        reason: reason ? String(reason).trim() : null,
        amount: a,
        method,
        createdBy: req.user.id,
      },
    });

    res.json(data);
  } catch (err) {
    console.error("❌ Lỗi tạo phiếu thu:", err);
    res.status(500).json({ error: "Không thể tạo phiếu thu" });
  }
});

router.get("/receipts", async (req, res) => {
  try {
    const list = await prisma.receipt.findMany({
      where: { createdBy: req.user.id },
      orderBy: [
        { date: "desc" },
        { id: "desc" },
      ],
      include: { user: true },
    });
    res.json(list);
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách phiếu thu:", err);
    res.status(500).json({ error: "Không thể tải phiếu thu" });
  }
});

router.delete("/receipts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const result = await prisma.receipt.deleteMany({
      where: {
        id,
        createdBy: req.user.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Không tìm thấy phiếu thu để xóa" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Lỗi xóa phiếu thu:", err);
    res.status(500).json({ error: "Không thể xóa phiếu thu" });
  }
});

/* =======================
 * Phiếu chi (02-TT)
 * =======================
 */
router.post("/payments", async (req, res) => {
  try {
    const { date, payee, reason, amount, method } = req.body;

    const d = parseDate(date);
    if (!d) {
      return res.status(400).json({ error: "Ngày không hợp lệ" });
    }

    if (!payee || !String(payee).trim()) {
      return res.status(400).json({ error: "Người nhận là bắt buộc" });
    }

    const a = parseAmount(amount);
    if (a === null || a <= 0) {
      return res.status(400).json({ error: "Số tiền phải lớn hơn 0" });
    }

    if (!ALLOWED_METHODS.includes(method)) {
      return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ" });
    }

    const data = await prisma.payment.create({
      data: {
        date: d,
        payee: String(payee).trim(),
        reason: reason ? String(reason).trim() : null,
        amount: a,
        method,
        createdBy: req.user.id,
      },
    });

    res.json(data);
  } catch (err) {
    console.error("❌ Lỗi tạo phiếu chi:", err);
    res.status(500).json({ error: "Không thể tạo phiếu chi" });
  }
});

router.get("/payments", async (req, res) => {
  try {
    const list = await prisma.payment.findMany({
      where: { createdBy: req.user.id },
      orderBy: [
        { date: "desc" },
        { id: "desc" },
      ],
      include: { user: true },
    });
    res.json(list);
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách phiếu chi:", err);
    res.status(500).json({ error: "Không thể tải phiếu chi" });
  }
});

router.delete("/payments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const result = await prisma.payment.deleteMany({
      where: {
        id,
        createdBy: req.user.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Không tìm thấy phiếu chi để xóa" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Lỗi xóa phiếu chi:", err);
    res.status(500).json({ error: "Không thể xóa phiếu chi" });
  }
});

/* =======================
 * Nhập kho / Xuất kho & lịch sử (giữ nguyên nếu test chưa đụng tới)
 * =======================
 */

// Nhập kho
router.post("/inventory/in", async (req, res) => {
  try {
    const { itemId, itemCode, qty, unitPrice } = req.body;
    if (!itemId && !itemCode) {
      return res.status(400).json({ error: "Thiếu itemId hoặc itemCode" });
    }

    const item = itemId
      ? await prisma.inventoryItem.findUnique({ where: { id: Number(itemId) } })
      : await prisma.inventoryItem.findUnique({ where: { code: String(itemCode) } });

    if (!item || item.createdBy !== req.user.id) {
      return res.status(404).json({ error: "Hàng hóa không tồn tại" });
    }

    const nQty = parseAmount(qty);
    if (nQty === null || nQty <= 0) {
      return res.status(400).json({ error: "Số lượng phải > 0" });
    }

    const nPrice = unitPrice != null ? parseAmount(unitPrice) : null;
    if (unitPrice != null && (nPrice === null || nPrice < 0)) {
      return res.status(400).json({ error: "Đơn giá không hợp lệ" });
    }

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
    if (!itemId && !itemCode) {
      return res.status(400).json({ error: "Thiếu itemId hoặc itemCode" });
    }

    const item = itemId
      ? await prisma.inventoryItem.findUnique({ where: { id: Number(itemId) } })
      : await prisma.inventoryItem.findUnique({ where: { code: String(itemCode) } });

    if (!item || item.createdBy !== req.user.id) {
      return res.status(404).json({ error: "Hàng hóa không tồn tại" });
    }

    const nQty = parseAmount(qty);
    if (nQty === null || nQty <= 0) {
      return res.status(400).json({ error: "Số lượng phải > 0" });
    }

    if (item.quantity < nQty) {
      return res.status(400).json({ error: "Tồn kho không đủ" });
    }

    const nPrice = unitPrice != null ? parseAmount(unitPrice) : item.unitPriceOut ?? null;
    if (unitPrice != null && (nPrice === null || nPrice < 0)) {
      return res.status(400).json({ error: "Đơn giá không hợp lệ" });
    }

    const tx = await prisma.$transaction(async (txp) => {
      const updated = await txp.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: { decrement: nQty },
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

// Lịch sử giao dịch kho
router.get("/inventory/transactions", async (req, res) => {
  try {
    const { itemId } = req.query;

    const where = itemId
      ? { itemId: Number(itemId), createdBy: req.user.id }
      : { createdBy: req.user.id };

    const list = await prisma.inventoryTxn.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        item: true,
      },
    });

    res.json(list);
  } catch (err) {
    console.error("❌ Lỗi tải lịch sử kho:", err);
    res.status(500).json({ error: "Không thể tải lịch sử kho" });
  }
});

export default router;
