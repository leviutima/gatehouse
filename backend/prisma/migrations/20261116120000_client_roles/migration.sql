-- AlterTable
ALTER TABLE "roles" ADD COLUMN "client_id" UUID;

-- DropIndex
DROP INDEX "roles_realm_id_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "roles_realm_id_client_id_name_key" ON "roles"("realm_id", "client_id", "name") NULLS NOT DISTINCT;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_realm_id_client_id_fkey" FOREIGN KEY ("realm_id", "client_id") REFERENCES "clients"("realm_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
