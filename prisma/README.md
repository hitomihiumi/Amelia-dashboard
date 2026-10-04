# Prisma in the dashboard

`schema.prisma` here is a copy of the bot's schema (`hitomihiumi/amelia`, generated for both repositories by
`scripts/generate-schema.ts`). **The bot repository owns the database migrations** (`prisma/migrations`).

This project therefore has no `prisma/migrations` folder and no `migrate dev` / `migrate reset` /
`migrate deploy` scripts. Running them against the shared database records a second, different migration
history, which is exactly what makes Prisma ask for a full database reset.

- Change the schema in the bot repository, add the migration there, then copy the schema here.
- Deploy migrations (and take backups, repair a history, upgrade PostgreSQL) with the bot's `scripts/db.mjs`,
  see its `docs/DEPLOYMENT.md`.
- Here only `pnpm prisma:generate` is needed (the build runs it).
