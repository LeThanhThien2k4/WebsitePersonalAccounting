import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

router.use(verifyToken);

// ===== Lấy danh sách nhân viên =====
router.get("/", async (req, res) => {
  try {
    const list = await prisma.employee.findMany({
      where: { createdBy: req.user.id },
      orderBy: { id: "asc" },
    });
    res.json(list);
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách nhân viên:", err);
    res.status(500).json({ error: "Không thể tải danh sách nhân viên" });
  }
});

// ===== Thêm nhân viên =====
router.post("/", async (req, res) => {
  try {
    const { code, fullName, position, baseSalary, bankAccount, bankName, isActive } = req.body;

    // Nếu không nhập code thì tự sinh
    const nextId = await prisma.employee.count({ where: { createdBy: req.user.id } }) + 1;
    const genCode = code || `EMP${String(nextId).padStart(3, "0")}`;

    const emp = await prisma.employee.create({
      data: {
        code: genCode,
        fullName,
        position,
        baseSalary: Number(baseSalary || 0),
        bankAccount,
        bankName,
        isActive: isActive ?? true,
        createdBy: req.user.id,
      },
    });

    res.json(emp);
  } catch (err) {
    console.error("❌ Lỗi tạo nhân viên:", err);
    res.status(400).json({ error: err.message });
  }
});

// ===== Cập nhật nhân viên =====
router.patch("/:id", async (req, res) => {
  try {
    const id = +req.params.id;
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp || emp.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy nhân viên" });

    const data = {};
    const allowed = ["code", "fullName", "position", "baseSalary", "bankAccount", "bankName", "isActive"];
    for (const k of allowed) if (k in req.body) data[k] = req.body[k];

    const updated = await prisma.employee.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    console.error("❌ Lỗi cập nhật nhân viên:", err);
    res.status(400).json({ error: err.message });
  }
});

// ===== Xóa nhân viên =====
router.delete("/:id", async (req, res) => {
  try {
    const id = +req.params.id;
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp || emp.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy nhân viên" });

    await prisma.employee.delete({ where: { id } });
    res.json({ message: "Đã xóa nhân viên" });
  } catch (err) {
    console.error("❌ Lỗi xóa nhân viên:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
