-- AlterTable
ALTER TABLE "SecurityRole" ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "SecurityRole_pkey" PRIMARY KEY ("id");
