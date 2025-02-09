-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_orderTypeId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderTypeName" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "orderTypeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_orderTypeId_fkey" FOREIGN KEY ("orderTypeId") REFERENCES "OrderType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
