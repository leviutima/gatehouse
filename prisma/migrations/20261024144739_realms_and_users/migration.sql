-- CreateExtension
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "LoginIdentifier" AS ENUM ('USERNAME', 'EMAIL', 'USERNAME_OR_EMAIL');

-- CreateTable
CREATE TABLE "realms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "login_identifier" "LoginIdentifier" NOT NULL DEFAULT 'USERNAME_OR_EMAIL',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "realms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "realm_id" UUID NOT NULL,
    "username" CITEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "realms_name_key" ON "realms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_realm_id_username_key" ON "users"("realm_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "users_realm_id_email_key" ON "users"("realm_id", "email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_realm_id_fkey" FOREIGN KEY ("realm_id") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
