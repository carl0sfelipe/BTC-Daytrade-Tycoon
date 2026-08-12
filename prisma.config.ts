import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Fallback keeps `prisma generate` (postinstall) working on fresh
    // clones and CI, where no .env exists yet.
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
