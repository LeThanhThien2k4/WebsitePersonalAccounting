/*
  Warnings:

  - You are about to drop the `InventoryIn` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryOut` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "createdBy" INTEGER,
ALTER COLUMN "unitPrice" SET DEFAULT 0;

-- DropTable
DROP TABLE "public"."InventoryIn";

-- DropTable
DROP TABLE "public"."InventoryOut";

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
