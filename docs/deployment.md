# Today Meal Deployment

This guide describes a basic production deployment for the Today Meal API with Docker Compose, PostgreSQL, and a reverse proxy such as Caddy.

## Server Requirements

- Docker Engine and Docker Compose.
- A production domain with HTTPS enabled, for example `api.today-meal.example.com`.
- The API domain configured as a valid WeChat Mini Program request domain.
- Network access from the reverse proxy to the `api` container on port `3000`.

## Environment Setup

For Docker Compose production, create the API and PostgreSQL environment file from the production example:

```bash
cp apps/api/.env.production.example apps/api/.env
```

Edit `apps/api/.env` and replace every placeholder value:

- Use the same strong PostgreSQL password in `POSTGRES_PASSWORD` and `DATABASE_URL`.
- Keep `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` aligned with the credentials and database name in `DATABASE_URL`.
- Set `NODE_ENV=production`.
- Keep `ENABLE_DEV_LOGIN=false` in production. `/auth/dev-login` is only for local development or tests.
- Set a `JWT_SECRET` with at least 32 characters.
- Fill in the production WeChat Mini Program credentials.
- Set `EDITOR_INVITE_CODE` and `OWNER_OPENIDS` for the production team.
- Keep `DATABASE_URL` pointed at `postgres:5432` when the API runs inside Docker Compose.
- Keep `PUBLIC_BASE_URL` set to the public HTTPS API origin.
- Configure Alibaba Cloud OSS direct uploads:
  - `OSS_BUCKET` is the bucket name.
  - `OSS_ENDPOINT` is the bucket upload origin, for example `https://today-meal-production.oss-cn-hangzhou.aliyuncs.com`.
  - `OSS_PUBLIC_BASE_URL` is the public image origin, preferably a CDN/custom domain.
  - `OSS_ACCESS_KEY_ID` and `OSS_ACCESS_KEY_SECRET` must belong to an account or RAM user with the minimum permissions needed for object uploads.

Do not commit the real `apps/api/.env` file.

If you already have an older local `apps/api/.env`, add `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` before using Docker Compose.

## Reverse Proxy

`Caddyfile.example` contains a minimal Caddy site:

```caddyfile
api.today-meal.example.com {
  reverse_proxy api:3000
}
```

Adjust the domain before using it in production.

The legacy multipart upload endpoint can still serve local files under `/uploads/...`, but miniapp image upload now uses OSS signed direct upload. Configure both the API domain and the OSS/CDN domain in the WeChat Mini Program request/upload/download domain settings.

## Start Services

Build and start the API and PostgreSQL services:

```bash
docker compose up -d --build
```

The compose file keeps PostgreSQL available on the host at `localhost:5433` for local maintenance. Host-run development tools can use `localhost:5433`, but containers must use `postgres:5432` internally through `DATABASE_URL`.

For local full-stack Docker Compose, `apps/api/.env.example` uses `postgres:5432` because the API container resolves the Compose service name. If you run the API directly on the host instead of in Docker, change `DATABASE_URL` in your local, uncommitted `apps/api/.env` to use `localhost:5433`.

## Run Migrations

After PostgreSQL is healthy, apply Prisma migrations from the API image:

```bash
docker compose run --rm api pnpm prisma migrate deploy
```

The API image includes the Prisma 7 config, migrations, and workspace dependencies required for this command. It runs with `apps/api` as the working directory, so `prisma.config.ts` resolves `prisma/schema.prisma` and `prisma/migrations` correctly.

## Verify Health

Check the public health endpoint:

```bash
curl https://api.today-meal.example.com/health
```

Expected response:

```json
{ "data": { "status": "ok" } }
```

## Miniapp Configuration

For real devices and production releases, the miniapp API base URL must not point at `localhost`. Change the miniapp local API base to the production HTTPS API origin, for example `https://api.today-meal.example.com`, and make sure the same domain is configured in the WeChat Mini Program request domain settings.
