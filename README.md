# Today Meal

Today Meal 是一个给两个人使用的私人菜单微信小程序：记录自家菜谱、常点外卖和以后想试的灵感清单，并通过“抽一下”推荐今天吃什么。

第一版包含：

- 原生微信小程序，清新杂志感界面。
- NestJS API，提供认证、菜单、标签、吃过历史、推荐、上传和链接预览。
- PostgreSQL + Prisma 数据模型和迁移。
- Docker Compose 部署示例。

## 项目结构

```text
apps/
  api/       NestJS 后端服务
  miniapp/   微信小程序项目
packages/
  shared/    共享 TypeScript 类型和枚举
docs/
  deployment.md
  superpowers/
```

## 本地准备

安装依赖：

```bash
pnpm install
```

复制后端环境变量：

```bash
cp apps/api/.env.example apps/api/.env
```

默认 `.env.example` 面向 Docker Compose，本地全栈容器内 API 使用 `postgres:5432`。如果你在宿主机直接运行 API，请把本地未提交的 `apps/api/.env` 中 `DATABASE_URL` 改为：

```dotenv
DATABASE_URL="postgresql://today_meal:today_meal_dev@localhost:5433/today_meal?schema=public"
```

启动数据库：

```bash
docker compose up -d postgres
```

执行迁移：

```bash
pnpm --filter @today-meal/api prisma migrate dev
```

启动后端：

```bash
pnpm dev:api
```

健康检查：

```bash
curl http://localhost:3000/health
```

## 小程序开发

用微信开发者工具打开：

```text
apps/miniapp
```

本地开发时，小程序 API 地址默认是 `http://localhost:3000`。真机调试、体验版或正式发布前，需要把小程序 API base URL 改成 HTTPS 后端域名，并在微信公众平台配置合法 request 域名。

## 常用命令

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm --filter @today-meal/api test:e2e
```

当前 e2e 默认连接宿主机 `localhost:5433` 的 PostgreSQL。需要自定义时使用：

```bash
E2E_DATABASE_URL="postgresql://..." pnpm --filter @today-meal/api test:e2e
```

## Docker 部署

复制生产环境示例：

```bash
cp apps/api/.env.production.example apps/api/.env
```

编辑 `apps/api/.env`：

- 设置 `NODE_ENV=production`。
- 保持 `ENABLE_DEV_LOGIN=false`。
- 设置强 `JWT_SECRET`。
- 填写微信小程序 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`。
- 设置 `EDITOR_INVITE_CODE` 和 `OWNER_OPENIDS`。
- 保持容器内 `DATABASE_URL` 使用 `postgres:5432`。
- 设置 `PUBLIC_BASE_URL` 为 HTTPS API 域名。

构建并启动：

```bash
docker compose up -d --build
```

执行生产迁移：

```bash
docker compose run --rm api pnpm prisma migrate deploy
```

反向代理可参考 `Caddyfile.example`。上传图片由 API 通过 `/uploads/...` 提供，反代到 API 服务即可访问。

更详细部署说明见 `docs/deployment.md`。

## 注意事项

- 不要提交真实的 `apps/api/.env`。
- `/auth/dev-login` 仅用于本地开发和测试，生产环境必须保持关闭。
- `POST /link-preview` 是公开接口，已有 SSRF 防护，但生产环境建议在反向代理层增加限流。
- 仓库当前 `packageManager` 使用 `pnpm@latest`，pnpm 命令可能有版本警告，但不影响当前验证结果。
