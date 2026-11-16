import "dotenv/config";
import { defineConfig } from "prisma/config";

// generate n'a pas besoin de base : la CI installe sans DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
