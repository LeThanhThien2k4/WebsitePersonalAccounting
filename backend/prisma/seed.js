import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const accounts = [
    { code: "111", name: "Tiền mặt", type: "asset" },
    { code: "112", name: "Tiền gửi ngân hàng", type: "asset" },
    { code: "511", name: "Doanh thu bán hàng", type: "income" },
    { code: "632", name: "Giá vốn hàng bán", type: "expense" }
  ];

  for (const a of accounts) {
    await prisma.account.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    });
  }
  console.log("✅ Đã tạo danh mục tài khoản mẫu.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
