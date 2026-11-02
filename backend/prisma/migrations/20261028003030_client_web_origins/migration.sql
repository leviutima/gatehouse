-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "web_origins" TEXT[] DEFAULT ARRAY[]::TEXT[];

