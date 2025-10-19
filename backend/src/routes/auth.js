import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// === Đăng ký tài khoản ===
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email đã tồn tại" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    res.json({ message: "Đăng ký thành công", user });
  } catch (err) {
    console.error("Lỗi đăng ký:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Đăng nhập ===
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Sai email hoặc mật khẩu" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Sai email hoặc mật khẩu" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Lỗi đăng nhập:", err);
    res.status(500).json({ error: err.message });
  }
});
// Gửi OTP về email
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "Email không tồn tại" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // hết hạn sau 10 phút

  await prisma.passwordReset.create({ data: { email, otp, expiresAt } });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Kế Toán HKD" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Mã OTP khôi phục mật khẩu",
    text: `Mã OTP của bạn là: ${otp} (hết hạn sau 10 phút).`,
  });

  res.json({ message: "OTP đã được gửi về email của bạn" });
});

// Xác nhận OTP và đặt lại mật khẩu
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const record = await prisma.passwordReset.findFirst({
    where: { email, otp },
  });

  if (!record || new Date() > record.expiresAt)
    return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn" });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hashed },
  });

  await prisma.passwordReset.delete({ where: { id: record.id } });

  res.json({ message: "Mật khẩu đã được đặt lại thành công" });
});
export default router;
