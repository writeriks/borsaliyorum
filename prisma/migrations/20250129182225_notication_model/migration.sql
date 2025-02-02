/*
  Warnings:

  - You are about to drop the column `likeId` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `fromUserId` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_postId_fkey";

-- DropIndex
DROP INDEX "Notification_likeId_idx";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "likeId",
ADD COLUMN     "fromUserId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
