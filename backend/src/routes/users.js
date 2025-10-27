import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// Lấy thông tin người dùng hiện tại
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true,
        businessName: true, address: true, taxCode: true,
        bankAccount: true, bankName: true, phone: true
      }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Không thể tải thông tin người dùng" });
  }
});

// Cập nhật thông tin doanh nghiệp
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { businessName, address, taxCode, bankAccount, bankName, phone } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { businessName, address, taxCode, bankAccount, bankName, phone },
    });
    res.json({ message: "Đã cập nhật thông tin hồ sơ", user: updated });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi cập nhật thông tin" });
  }
});

export default router;
