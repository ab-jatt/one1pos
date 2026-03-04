/*
  Warnings:

  - You are about to drop the column `quantity` on the `StockMovement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "quantity",
ADD COLUMN     "closingStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openingStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantityIn" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantityOut" INTEGER NOT NULL DEFAULT 0;
