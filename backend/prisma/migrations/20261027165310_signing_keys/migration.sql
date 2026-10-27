-- CreateEnum
CREATE TYPE "SigningKeyStatus" AS ENUM ('ACTIVE', 'PASSIVE');

-- CreateTable
CREATE TABLE "signing_keys" (
    "id" UUID NOT NULL,
    "realm_id" UUID NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'ES256',
    "status" "SigningKeyStatus" NOT NULL,
    "public_jwk" JSONB NOT NULL,
    "encrypted_private_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "signing_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signing_keys_realm_id_status_idx" ON "signing_keys"("realm_id", "status");

-- AddForeignKey
ALTER TABLE "signing_keys" ADD CONSTRAINT "signing_keys_realm_id_fkey" FOREIGN KEY ("realm_id") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "signing_keys_one_active_per_realm" ON "signing_keys"("realm_id") WHERE "status" = 'ACTIVE';
