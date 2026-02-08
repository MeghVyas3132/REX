# REX Docker

Docker configurations for local development and production deployment.

## Purpose

This directory contains:
- Dockerfiles for each service
- Docker Compose configurations
- nginx configurations
- Environment templates

## Structure

```
docker/
├── backend/
│   ├── Dockerfile           # Backend production Dockerfile
│   └── Dockerfile.dev       # Backend development Dockerfile
├── frontend/
│   ├── Dockerfile          # Frontend production Dockerfile
│   ├── Dockerfile.dev      # Frontend development Dockerfile
│   └── nginx.conf          # nginx configuration
├── engine/
│   └── Dockerfile          # Standalone engine (future)
├── compose/
│   ├── docker-compose.yml         # Full stack
│   ├── docker-compose.dev.yml     # Development overrides
│   ├── docker-compose.prod.yml    # Production overrides
│   └── docker-compose.test.yml    # Testing configuration
├── nginx/
│   ├── nginx.conf          # Main nginx config
│   └── conf.d/
│       └── default.conf    # Site configuration
├── scripts/
│   ├── build.sh           # Build all images
│   ├── push.sh            # Push to registry
│   └── deploy.sh          # Deploy script
└── README.md
```

## Quick Start

### Development

```bash
# Start all services in dev mode
docker compose -f docker/compose/docker-compose.yml \
               -f docker/compose/docker-compose.dev.yml \
               up

# Or from root with alias
npm run docker:dev
```

### Production

```bash
# Build and start production
docker compose -f docker/compose/docker-compose.yml \
               -f docker/compose/docker-compose.prod.yml \
               up -d

# Or from root with alias
npm run docker:prod
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| frontend | 80 | React app served by nginx |
| backend | 3003 | Express API server |
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache/queue |

## Environment Variables

Copy the example file and configure:

```bash
cp docker/.env.example docker/.env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Authentication secret
- `ENCRYPTION_KEY` - Credential encryption key

## Building Images

```bash
# Build all
./docker/scripts/build.sh

# Build specific service
docker build -f docker/backend/Dockerfile -t rex-backend .
docker build -f docker/frontend/Dockerfile -t rex-frontend .
```

## Health Checks

- Backend: `http://localhost:3003/api/health`
- Frontend: `http://localhost/health`

## Volumes

- `rex_postgres_data` - PostgreSQL data
- `rex_redis_data` - Redis data
- `rex_uploads` - File uploads
