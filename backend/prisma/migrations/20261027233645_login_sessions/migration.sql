-- AlterTable
ALTER TABLE "realms" ADD COLUMN     "session_idle_timeout" INTEGER NOT NULL DEFAULT 1800,
ADD COLUMN     "session_max_lifespan" INTEGER NOT NULL DEFAULT 36000;

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "realm_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "auth_time" TIMESTAMPTZ NOT NULL,
    "last_seen_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorization_codes" (
    "id" UUID NOT NULL,
    "realm_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "nonce" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorization_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_realm_id_user_id_idx" ON "sessions"("realm_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "authorization_codes_code_hash_key" ON "authorization_codes"("code_hash");

-- CreateIndex
CREATE UNIQUE INDEX "clients_realm_id_id_key" ON "clients"("realm_id", "id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_realm_id_fkey" FOREIGN KEY ("realm_id") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_realm_id_user_id_fkey" FOREIGN KEY ("realm_id", "user_id") REFERENCES "users"("realm_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_realm_id_client_id_fkey" FOREIGN KEY ("realm_id", "client_id") REFERENCES "clients"("realm_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_realm_id_user_id_fkey" FOREIGN KEY ("realm_id", "user_id") REFERENCES "users"("realm_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

