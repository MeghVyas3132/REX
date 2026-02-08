# REX Database

Database schemas, migrations, and Prisma configuration.

## Purpose

This package contains:
- Prisma schema definitions
- Database migrations
- Seed scripts
- Database utilities

## Structure

```
db/
├── prisma/
│   ├── schema.prisma       # Main Prisma schema
│   ├── migrations/         # All migrations
│   │   ├── 20240101_init/
│   │   └── ...
│   └── seed.ts            # Database seeding
├── src/
│   ├── client.ts          # Prisma client initialization
│   ├── queries/           # Common queries
│   │   ├── workflows.ts
│   │   ├── executions.ts
│   │   └── ...
│   └── utils/
│       ├── pagination.ts
│       └── filters.ts
├── scripts/
│   ├── migrate.ts         # Migration runner
│   ├── seed.ts           # Seed runner
│   └── reset.ts          # Database reset
├── package.json
└── README.md
```

## Database Schema

### Core Tables

- `users` - User accounts
- `organizations` - Multi-tenancy
- `workflows` - Workflow definitions
- `workflow_versions` - Version history
- `workflow_runs` - Execution records
- `node_executions` - Per-node execution logs
- `credentials` - Encrypted credentials
- `webhooks` - Webhook configurations
- `audit_logs` - Activity tracking

## Commands

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Create new migration
npm run db:migrate:create

# Reset database
npm run db:reset

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Environment Variables

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/rex"
```

## Migration Workflow

1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate:create -- --name migration_name`
3. Review generated migration
4. Run `npm run db:migrate`

## Dependencies

- `@prisma/client` - Database client
- `prisma` - Migration tooling
- `@rex/shared` - Shared types
