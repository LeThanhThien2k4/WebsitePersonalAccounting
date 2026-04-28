/*
  Warnings:

  - You are about to drop the column `unitPrice` on the `InventoryItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "unitPrice",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "unitPriceIn" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "unitPriceOut" DECIMAL(65,30) NOT NULL DEFAULT 0;
