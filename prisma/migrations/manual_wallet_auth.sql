-- Better Auth SIWE — carteiras vinculadas ao usuário
CREATE TABLE IF NOT EXISTS "wallet_addresses" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "wallet_addresses_userId_idx" ON "wallet_addresses"("userId");
CREATE INDEX IF NOT EXISTS "wallet_addresses_address_chainId_idx" ON "wallet_addresses"("address", "chainId");

ALTER TABLE "wallet_addresses"
  ADD CONSTRAINT "wallet_addresses_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
