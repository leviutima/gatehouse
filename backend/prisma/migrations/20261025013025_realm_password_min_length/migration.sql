-- AlterTable
ALTER TABLE "realms" ADD COLUMN     "password_min_length" INTEGER NOT NULL DEFAULT 12;

ALTER TABLE "realms" ADD CONSTRAINT "realms_password_min_length_check" CHECK ("password_min_length" BETWEEN 8 AND 256);
