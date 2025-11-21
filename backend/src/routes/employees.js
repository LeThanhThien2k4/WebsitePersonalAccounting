import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

router.use(verifyToken);

/* ===========================
   LẤY DANH SÁCH NHÂN VIÊN
=========================== */
router.get("/", async (req, res) => {
  try {
    const list = await prisma.employee.findMany({
      where: { createdBy: req.user.id },
      orderBy: { code: "asc" },
    });
    res.json(list);
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách nhân viên:", err);
    res.status(500).json({ error: "Không thể tải danh sách nhân viên" });
  }
});

/* ===========================
   TỰ SINH MÃ NHÂN VIÊN CHUẨN
=========================== */
async function generateEmployeeCode(userId) {
  const last = await prisma.employee.findFirst({
    where: { createdBy: userId },
    orderBy: { code: "desc" }, // EMP010 > EMP009 > EMP008
    select: { code: true },
  });

  if (!last) return "EMP001";

  const num = Number(last.code.replace("EMP", "")) + 1;
  return `EMP${String(num).padStart(3, "0")}`;
}

/* ===========================
   THÊM NHÂN VIÊN
=========================== */
router.post("/", async (req, res) => {
  try {
    const { code, fullName, position, baseSalary, bankAccount, bankName, isActive } = req.body;

    // ===== Validate cơ bản =====
    if (!fullName || !fullName.trim()) return res.status(400).json({ error: "Tên nhân viên không được để trống" });
    if (baseSalary < 0) return res.status(400).json({ error: "Lương cơ bản không hợp lệ" });

    // ===== Sinh mã tự động =====
    const genCode = code?.trim() || await generateEmployeeCode(req.user.id);

    // ===== Tạo nhân viên =====
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

    if (err.code === "P2002") {
      return res.status(400).json({ error: "Mã nhân viên đã tồn tại" });
    }

    res.status(400).json({ error: err.message });
  }
});

/* ===========================
   CẬP NHẬT NHÂN VIÊN
=========================== */
router.patch("/:id", async (req, res) => {
  try {
    const id = +req.params.id;

    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp || emp.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy nhân viên" });

    const { code, fullName, position, baseSalary, bankAccount, bankName, isActive } = req.body;

    // Validate
    if (fullName !== undefined && !fullName.trim())
      return res.status(400).json({ error: "Tên nhân viên không được để trống" });

    if (baseSalary !== undefined && baseSalary < 0)
      return res.status(400).json({ error: "Lương cơ bản không hợp lệ" });

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        code,
        fullName,
        position,
        baseSalary: baseSalary !== undefined ? Number(baseSalary) : undefined,
        bankAccount,
        bankName,
        isActive,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Lỗi cập nhật nhân viên:", err);

    if (err.code === "P2002") {
      return res.status(400).json({ error: "Mã nhân viên đã tồn tại" });
    }

    res.status(400).json({ error: err.message });
  }
});

/* ===========================
   XÓA NHÂN VIÊN
=========================== */
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
