import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

/* ===========================
   LẤY HỒ SƠ NGƯỜI DÙNG
=========================== */
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        businessName: true,
        address: true,
        taxCode: true,
        bankAccount: true,
        bankName: true,
        phone: true,
      },
    });

    if (!user)
      return res.status(404).json({ error: "Không tìm thấy người dùng" });

    res.json(user);
  } catch (err) {
    console.error("❌ Lỗi tải hồ sơ:", err);
    res.status(500).json({ error: "Không thể tải thông tin người dùng" });
  }
});

/* ===========================
   CẬP NHẬT HỒ SƠ NGƯỜI DÙNG
=========================== */
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const {
      businessName = "",
      address = "",
      taxCode = "",
      bankAccount = "",
      bankName = "",
      phone = "",
    } = req.body;

    // ===========================
    // VALIDATE
    // ===========================
    const required = [
      { value: businessName, msg: "Tên hộ/cá nhân kinh doanh không được để trống" },
      { value: address, msg: "Địa chỉ không được để trống" },
      { value: taxCode, msg: "Mã số thuế không được để trống" },
      { value: bankAccount, msg: "Số tài khoản không được để trống" },
      { value: bankName, msg: "Tên ngân hàng không được để trống" },
      { value: phone, msg: "Số điện thoại không được để trống" },
    ];

    for (const f of required) {
      if (!f.value.trim()) return res.status(400).json({ error: f.msg });
    }

    // MST: 10 hoặc 13 số
    if (!/^\d{10}(\d{3})?$/.test(taxCode))
      return res.status(400).json({ error: "Mã số thuế không hợp lệ" });

    // Số tài khoản = toàn số
    if (!/^\d+$/.test(bankAccount))
      return res.status(400).json({ error: "Số tài khoản phải là số" });

    // Phone VN: 10 số bắt đầu bằng 0 hoặc +84
    if (!/^(0|\+84)\d{9}$/.test(phone))
      return res.status(400).json({ error: "Số điện thoại không hợp lệ" });

    // ===========================
    // UPDATE DB
    // ===========================
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        businessName: businessName.trim(),
        address: address.trim(),
        taxCode: taxCode.trim(),
        bankAccount: bankAccount.trim(),
        bankName: bankName.trim(),
        phone: phone.trim(),
      },
    });

    res.json({
      message: "Cập nhật hồ sơ thành công",
      profile: updated,
    });
  } catch (err) {
    console.error("❌ Lỗi cập nhật profile:", err);
    res.status(500).json({ error: "Lỗi khi cập nhật thông tin" });
  }
});

export default router;
