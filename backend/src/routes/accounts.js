import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// Lấy danh sách tài khoản
router.get("/", verifyToken, async (_req, res) => {
  const list = await prisma.account.findMany({ orderBy: { code: "asc" } });
  res.json(list);
});

// Thêm tài khoản mới
router.post("/", verifyToken, async (req, res) => {
  try {
    const { code, name, type } = req.body;
    const created = await prisma.account.create({
      data: { code, name, type },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("❌ Lỗi tạo tài khoản:", err);
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật tài khoản
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type } = req.body;
    const updated = await prisma.account.update({
      where: { id: Number(id) },
      data: { code, name, type },
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ Lỗi cập nhật tài khoản:", err);
    res.status(500).json({ error: err.message });
  }
});

// Xóa tài khoản
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await prisma.account.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Đã xóa tài khoản" });
  } catch (err) {
    console.error("❌ Lỗi xóa tài khoản:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
