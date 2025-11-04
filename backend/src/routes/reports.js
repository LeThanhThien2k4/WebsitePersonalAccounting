import express from "express";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* === Hàm đổi số thành chữ (giống FE) === */
function moneyToWordsVn(n) {
  n = Math.round(Number(n || 0));
  if (n === 0) return "Không đồng";
  const d = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
  const s = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ"];
  function read3(x) {
    const tr = Math.floor(x / 100), ch = Math.floor((x % 100) / 10), dv = x % 10;
    let t = "";
    if (tr > 0) t += d[tr] + " trăm" + (ch === 0 && dv > 0 ? " lẻ" : "");
    if (ch > 1)
      t += " " + d[ch] + " mươi" + (dv === 1 ? " mốt" : dv === 5 ? " lăm" : dv > 0 ? " " + d[dv] : "");
    else if (ch === 1)
      t += " mười" + (dv === 5 ? " lăm" : dv > 0 ? " " + d[dv] : "");
    else if (ch === 0 && dv > 0) t += " " + d[dv];
    return t.trim();
  }
  let res = "", i = 0;
  while (n > 0) {
    const block = n % 1000;
    if (block > 0) res = read3(block) + s[i] + (res ? " " + res : "");
    n = Math.floor(n / 1000); i++;
  }
  return res.charAt(0).toUpperCase() + res.slice(1) + " đồng";
}

/* === Xuất PDF phiếu chi (PaymentPDF) === */
router.get("/payment/pdf", verifyToken, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: Number(req.query.id) },
    });
    if (!payment || payment.createdBy !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy phiếu chi" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { businessName: true, address: true },
    });

    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/payment.ejs"),
      {
        businessName: user?.businessName || "Hộ/CN kinh doanh",
        address: user?.address || "—",
        payee: payment.payee,
        addressPayee: "", // nếu có thêm trường địa chỉ người nhận
        reason: payment.reason,
        amount: payment.amount,
        amountText: moneyToWordsVn(payment.amount), // ✅ thêm dòng này
        attach: "", // nếu có
        date: payment.date.toLocaleDateString("vi-VN"),
        method: payment.method === "cash" ? "Tiền mặt" : "Chuyển khoản",
      }
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="phieu-chi-${payment.id}.pdf"`
    );
    res.end(pdf);
  } catch (err) {
    console.error("❌ Lỗi tạo PDF phiếu chi:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
