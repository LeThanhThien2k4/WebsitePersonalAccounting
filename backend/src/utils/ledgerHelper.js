// backend/src/utils/ledgerHelper.js

/**
 * Tính tổng hợp dữ liệu Sổ quỹ tiền mặt (S6-HKD)
 * và Sổ tiền gửi ngân hàng (S7-HKD)
 * @param {PrismaClient} prisma
 * @param {number} userId
 * @param {"cash"|"bank"} method
 * @param {string} from - yyyy-mm-dd
 * @param {string} to - yyyy-mm-dd
 */
export async function buildLedgerData(prisma, userId, method, from, to) {
  const filter = {};
  if (from && to) filter.date = { gte: new Date(from), lte: new Date(to) };
  else if (from) filter.date = { gte: new Date(from) };
  else if (to) filter.date = { lte: new Date(to) };

  // --- Truy vấn phiếu thu & chi ---
  const receipts = await prisma.receipt.findMany({
    where: { createdBy: userId, method, ...filter },
    select: { id: true, date: true, reason: true, amount: true },
    orderBy: { date: "asc" },
  });

  const payments = await prisma.payment.findMany({
    where: { createdBy: userId, method, ...filter },
    select: { id: true, date: true, reason: true, amount: true },
    orderBy: { date: "asc" },
  });

  // --- Gộp dữ liệu ledger ---
  const ledger = [
    ...receipts.map((r) => ({
      id: `R${r.id}`,
      date: r.date,
      reason: r.reason || "Thu tiền",
      type: "THU",
      amount: Number(r.amount || 0),
      signedAmount: Number(r.amount || 0),
    })),
    ...payments.map((p) => ({
      id: `P${p.id}`,
      date: p.date,
      reason: p.reason || "Chi tiền",
      type: "CHI",
      amount: Number(p.amount || 0),
      signedAmount: -Number(p.amount || 0),
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  // --- Tính tổng ---
  const totalIn = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalOut = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const balance = totalIn - totalOut;

  // --- Cộng dồn số dư từng dòng ---
  let running = 0;
  ledger.forEach((row) => {
    running += row.signedAmount;
    row.balance = running;
  });

  return { totalIn, totalOut, balance, ledger };
}
