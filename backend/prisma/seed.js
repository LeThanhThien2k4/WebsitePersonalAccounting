import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.payrollRate.create({
    data: {
      effectiveFrom: new Date("2025-01-01"),
      active: true,
      salaryFloor: 1800000,
      salaryCeiling: 36000000,
      bhxhEmp: 8,
      bhytEmp: 1.5,
      bhtnEmp: 1,
      unionEmp: 1,
      // thêm đầy đủ các field của bảng
      bhxhEr: 17.5,   // employer rate
      bhytEr: 3.0,
      bhtnEr: 1.0,
      unionEr: 2.0,
    },
  });

  console.log("✅ Seeded PayrollRate successfully");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
