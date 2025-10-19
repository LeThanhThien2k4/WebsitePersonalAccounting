import express from "express";
import { PrismaClient } from "@prisma/client";
import verifyToken from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/summary", verifyToken, async (_req, res) => {
  const totalReceipts = await prisma.receipt.aggregate({ _sum: { amount: true } });
  const totalPayments = await prisma.payment.aggregate({ _sum: { amount: true } });
  const totalPayroll = await prisma.payroll.aggregate({ _sum: { total: true } });

  const cash = totalReceipts._sum.amount - totalPayments._sum.amount;
  const data = {
    totalReceipts: totalReceipts._sum.amount || 0,
    totalPayments: totalPayments._sum.amount || 0,
    totalPayroll: totalPayroll._sum.total || 0,
    balance: cash,
  };
  res.json(data);
});

export default router;
