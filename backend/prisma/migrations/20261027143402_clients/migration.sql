-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PUBLIC', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "GrantType" AS ENUM ('AUTHORIZATION_CODE', 'REFRESH_TOKEN', 'CLIENT_CREDENTIALS');

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "realm_id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ClientType" NOT NULL,
    "secret_hash" TEXT,
    "redirect_uris" TEXT[],
    "grant_types" "GrantType"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_realm_id_client_id_key" ON "clients"("realm_id", "client_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_realm_id_fkey" FOREIGN KEY ("realm_id") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
