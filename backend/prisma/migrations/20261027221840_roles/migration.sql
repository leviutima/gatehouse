-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "realm_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "realm_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_realm_id_name_key" ON "roles"("realm_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_realm_id_id_key" ON "roles"("realm_id", "id");

-- CreateIndex
CREATE INDEX "user_roles_realm_id_role_id_idx" ON "user_roles"("realm_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_realm_id_id_key" ON "users"("realm_id", "id");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_realm_id_fkey" FOREIGN KEY ("realm_id") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_realm_id_user_id_fkey" FOREIGN KEY ("realm_id", "user_id") REFERENCES "users"("realm_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_realm_id_role_id_fkey" FOREIGN KEY ("realm_id", "role_id") REFERENCES "roles"("realm_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

