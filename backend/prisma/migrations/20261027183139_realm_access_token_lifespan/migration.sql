-- AlterTable
ALTER TABLE "realms" ADD COLUMN     "access_token_lifespan" INTEGER NOT NULL DEFAULT 300;
