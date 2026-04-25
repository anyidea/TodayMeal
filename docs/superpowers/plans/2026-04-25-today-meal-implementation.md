# Today Meal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Today Meal MVP as a monorepo containing a NestJS API, PostgreSQL data model, shared TypeScript contracts, and a native WeChat Mini Program.

**Architecture:** The API owns authentication, permissions, menu data, recommendation rules, file uploads, and link preview. The mini program consumes typed API contracts from `packages/shared` and keeps all user-facing flows inside WeChat. PostgreSQL is managed through Prisma migrations, and local/server deployment uses Docker Compose.

**Tech Stack:** pnpm workspaces, TypeScript, NestJS, Prisma, PostgreSQL, Jest/Supertest, native WeChat Mini Program, Docker Compose, Caddy or Nginx reverse proxy.

---

## File Structure Map

- Create `package.json`: root workspace scripts for linting, testing, building, and running apps.
- Create `pnpm-workspace.yaml`: workspace package list.
- Create `tsconfig.base.json`: shared TypeScript compiler defaults.
- Create `apps/api`: NestJS API service.
- Create `apps/api/prisma/schema.prisma`: database schema and migrations source.
- Create `apps/api/src/modules/*`: focused API modules.
- Create `apps/api/test/*`: API unit and e2e tests.
- Create `apps/miniapp`: native WeChat Mini Program.
- Create `apps/miniapp/miniprogram`: pages, components, services, styles, and app config.
- Create `packages/shared`: shared enums, DTO-shaped API contracts, and response types.
- Create `docker-compose.yml`: local and server runtime dependencies.
- Create `docs/deployment.md`: server setup and release instructions.

The implementation order is backend-first: shared contracts, database schema, API modules with tests, then mini program pages wired to the API.

---

## Task 1: Monorepo Foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create root workspace files**

Write `package.json`:

```json
{
  "name": "today-meal",
  "private": true,
  "packageManager": "pnpm@latest",
  "scripts": {
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "dev:api": "pnpm --filter @today-meal/api start:dev"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

Write `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Write `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 2: Create shared package skeleton**

Write `packages/shared/package.json`:

```json
{
  "name": "@today-meal/shared",
  "version": "0.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "test": "echo \"shared package has no tests yet\"",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

Write `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src/**/*.ts"]
}
```

Write `packages/shared/src/index.ts`:

```ts
export enum MenuItemType {
  Recipe = 'recipe',
  Takeout = 'takeout',
  Inspiration = 'inspiration',
}

export enum MealPeriod {
  Breakfast = 'breakfast',
  Lunch = 'lunch',
  Dinner = 'dinner',
  LateNight = 'lateNight',
}

export enum UserRole {
  Viewer = 'viewer',
  Editor = 'editor',
  Owner = 'owner',
}

export type ApiResponse<T> = {
  data: T;
};
```

- [ ] **Step 3: Update `.gitignore`**

Ensure `.gitignore` contains:

```gitignore
.superpowers/
node_modules/
dist/
.env
.env.*
!.env.example
apps/api/uploads/
```

- [ ] **Step 4: Install and verify**

Run: `pnpm install`

Expected: `pnpm-lock.yaml` is created and install exits with code 0.

Run: `pnpm typecheck`

Expected: all workspace packages typecheck successfully; the shared package reports no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml .gitignore packages/shared
git commit -m "chore: set up monorepo workspace"
```

---

## Task 2: API Scaffold and Health Check

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/common/api-response.ts`
- Create: `apps/api/src/modules/health/health.controller.ts`
- Create: `apps/api/test/health.e2e-spec.ts`
- Create: `apps/api/jest-e2e.json`

- [ ] **Step 1: Add API package and dependencies**

Run:

```bash
pnpm --filter @today-meal/api add @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config reflect-metadata rxjs class-validator class-transformer
pnpm --filter @today-meal/api add -D @nestjs/cli @nestjs/testing @types/express @types/jest @types/node jest supertest ts-jest ts-node tsconfig-paths typescript
```

If `apps/api/package.json` does not exist before installing, create it first:

```json
{
  "name": "@today-meal/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "lint": "tsc -p tsconfig.json --noEmit",
    "test": "jest",
    "test:e2e": "jest --config ./jest-e2e.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

- [ ] **Step 2: Write API TypeScript config**

Write `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "baseUrl": ".",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

Write `apps/api/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["test", "**/*.spec.ts", "dist"]
}
```

- [ ] **Step 3: Write health e2e test first**

Write `apps/api/test/health.e2e-spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns API health status', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ data: { status: 'ok' } });
  });
});
```

Write `apps/api/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

- [ ] **Step 4: Run failing health test**

Run: `pnpm --filter @today-meal/api test:e2e`

Expected: FAIL because `AppModule` and `/health` are not implemented yet.

- [ ] **Step 5: Implement minimal API**

Write `apps/api/src/common/api-response.ts`:

```ts
export function ok<T>(data: T): { data: T } {
  return { data };
}
```

Write `apps/api/src/modules/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { ok } from '../../common/api-response';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return ok({ status: 'ok' });
  }
}
```

Write `apps/api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
})
export class AppModule {}
```

Write `apps/api/src/main.ts`:

```ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();
```

- [ ] **Step 6: Verify and commit**

Run: `pnpm --filter @today-meal/api test:e2e`

Expected: PASS for `Health returns API health status`.

Run: `pnpm --filter @today-meal/api typecheck`

Expected: no TypeScript errors.

```bash
git add apps/api package.json pnpm-lock.yaml
git commit -m "feat(api): add NestJS health check"
```

---

## Task 3: Database Schema and Prisma Service

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/.env.example`
- Create: `docker-compose.yml`

- [ ] **Step 1: Add Prisma dependencies**

Run:

```bash
pnpm --filter @today-meal/api add @prisma/client
pnpm --filter @today-meal/api add -D prisma
```

Expected: dependencies are added to `apps/api/package.json`.

- [ ] **Step 2: Write Prisma schema**

Write `apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  viewer
  editor
  owner
}

enum MenuItemType {
  recipe
  takeout
  inspiration
}

enum MealPeriod {
  breakfast
  lunch
  dinner
  lateNight
}

enum TagType {
  system
  custom
}

enum MenuItemStatus {
  active
  archived
}

model User {
  id        String   @id @default(cuid())
  openid    String   @unique
  nickname  String?
  avatarUrl String?
  role      UserRole @default(viewer)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  createdMenuItems MenuItem[] @relation("MenuCreatedBy")
  updatedMenuItems MenuItem[] @relation("MenuUpdatedBy")
  mealHistories    MealHistory[]
  uploadedFiles    FileAsset[]
}

model MenuItem {
  id              String         @id @default(cuid())
  type            MenuItemType
  title           String
  subtitle        String?
  description     String?
  coverImageUrl   String?
  mealPeriods     MealPeriod[]
  isFavorite      Boolean        @default(false)
  status          MenuItemStatus @default(active)
  ingredients     String[]
  steps           String[]
  cookTimeMinutes Int?
  difficulty      String?
  notes           String?
  restaurantName  String?
  platform        String?
  externalUrl     String?
  priceRange      String?
  deliveryNotes   String?
  linkPreview     Json?
  sourceName      String?
  sourceUrl       String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  createdById String?
  createdBy   User? @relation("MenuCreatedBy", fields: [createdById], references: [id])
  updatedById String?
  updatedBy   User? @relation("MenuUpdatedBy", fields: [updatedById], references: [id])

  tags          MenuItemTag[]
  mealHistories MealHistory[]
}

model Tag {
  id        String   @id @default(cuid())
  name      String   @unique
  type      TagType  @default(custom)
  color     String?
  createdAt DateTime @default(now())

  menuItems MenuItemTag[]
}

model MenuItemTag {
  menuItemId String
  tagId      String

  menuItem MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  tag      Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([menuItemId, tagId])
}

model MealHistory {
  id         String   @id @default(cuid())
  menuItemId String
  eatenAt    DateTime
  rating     Int?
  note       String?
  createdAt  DateTime @default(now())

  menuItem  MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  createdById String?
  createdBy   User? @relation(fields: [createdById], references: [id])
}

model FileAsset {
  id          String   @id @default(cuid())
  url         String
  storageKey  String   @unique
  mimeType    String
  size        Int
  createdAt   DateTime @default(now())
  uploadedById String?
  uploadedBy   User? @relation(fields: [uploadedById], references: [id])
}
```

- [ ] **Step 3: Add local database runtime**

Write `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: today_meal
      POSTGRES_PASSWORD: today_meal_dev
      POSTGRES_DB: today_meal
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Write `apps/api/.env.example`:

```dotenv
DATABASE_URL="postgresql://today_meal:today_meal_dev@localhost:5432/today_meal?schema=public"
JWT_SECRET="dev-secret-at-least-32-characters-long"
WECHAT_APP_ID="dev-wechat-mini-program-app-id"
WECHAT_APP_SECRET="dev-wechat-mini-program-app-secret"
EDITOR_INVITE_CODE="change-me"
OWNER_OPENIDS=""
UPLOAD_DIR="./uploads"
PUBLIC_BASE_URL="http://localhost:3000"
```

- [ ] **Step 4: Add Prisma service**

Write `apps/api/src/prisma/prisma.service.ts`:

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

Modify `apps/api/src/app.module.ts` so it provides `PrismaService`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './modules/health/health.controller';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
```

- [ ] **Step 5: Generate migration and verify**

Run: `docker compose up -d postgres`

Expected: PostgreSQL container starts.

Create `apps/api/.env` from `.env.example` for local development, then run:

```bash
pnpm --filter @today-meal/api prisma migrate dev --name init
pnpm --filter @today-meal/api typecheck
```

Expected: Prisma migration is created under `apps/api/prisma/migrations`, Prisma client is generated, and typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml apps/api/prisma apps/api/src/prisma apps/api/src/app.module.ts apps/api/.env.example apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add database schema"
```

---

## Task 4: Authentication and Editor Permissions

**Files:**
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/dto/wechat-login.dto.ts`
- Create: `apps/api/src/modules/auth/dto/bind-invite.dto.ts`
- Create: `apps/api/src/modules/auth/current-user.decorator.ts`
- Create: `apps/api/src/modules/auth/editor.guard.ts`
- Create: `apps/api/src/modules/auth/jwt-auth.guard.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: Add auth dependencies**

Run:

```bash
pnpm --filter @today-meal/api add @nestjs/jwt passport-jwt
pnpm --filter @today-meal/api add -D @types/passport-jwt
```

Expected: dependencies are added successfully.

- [ ] **Step 2: Write auth e2e tests first**

Write `apps/api/test/auth.e2e-spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.EDITOR_INVITE_CODE = 'invite-123';
    process.env.OWNER_OPENIDS = 'owner-openid';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('binds editor permission with invite code', async () => {
    await prisma.user.create({ data: { openid: 'user-openid', role: 'viewer' } });

    const login = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'user-openid' })
      .expect(201);

    const token = login.body.data.token;

    await request(app.getHttpServer())
      .post('/auth/bind-invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ inviteCode: 'invite-123' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.role).toBe('editor');
      });
  });
});
```

- [ ] **Step 3: Run failing auth test**

Run: `pnpm --filter @today-meal/api test:e2e -- auth.e2e-spec.ts`

Expected: FAIL because auth module and routes are missing.

- [ ] **Step 4: Implement DTOs and guards**

Write `apps/api/src/modules/auth/dto/wechat-login.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  @MinLength(1)
  code!: string;
}

export class DevLoginDto {
  @IsString()
  @MinLength(1)
  openid!: string;
}
```

Write `apps/api/src/modules/auth/dto/bind-invite.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class BindInviteDto {
  @IsString()
  @MinLength(1)
  inviteCode!: string;
}
```

Write `apps/api/src/modules/auth/current-user.decorator.ts`:

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = {
  id: string;
  openid: string;
  role: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
```

Write `apps/api/src/modules/auth/jwt-auth.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    request.user = this.jwtService.verify(authHeader.slice('Bearer '.length));
    return true;
  }
}
```

Write `apps/api/src/modules/auth/editor.guard.ts`:

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestUser } from './current-user.decorator';

@Injectable()
export class EditorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (request.user?.role === 'editor' || request.user?.role === 'owner') {
      return true;
    }
    throw new ForbiddenException('Editor permission is required');
  }
}
```

- [ ] **Step 5: Implement auth service and controller**

Write `apps/api/src/modules/auth/auth.service.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async devLogin(openid: string) {
    return this.loginWithOpenid(openid);
  }

  async loginWithOpenid(openid: string) {
    const ownerOpenids = this.configService.get<string>('OWNER_OPENIDS')?.split(',').filter(Boolean) ?? [];
    const role = ownerOpenids.includes(openid) ? UserRole.owner : UserRole.viewer;
    const user = await this.prisma.user.upsert({
      where: { openid },
      update: {},
      create: { openid, role },
    });

    return this.issueToken(user.id, user.openid, user.role);
  }

  async bindInvite(userId: string, inviteCode: string) {
    const expected = this.configService.get<string>('EDITOR_INVITE_CODE');
    if (!expected || inviteCode !== expected) {
      throw new UnauthorizedException('Invalid invite code');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.editor },
    });

    return { role: user.role };
  }

  private issueToken(id: string, openid: string, role: UserRole) {
    const token = this.jwtService.sign({ id, openid, role });
    return { token, user: { id, openid, role } };
  }
}
```

Write `apps/api/src/modules/auth/auth.controller.ts`:

```ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { AuthService } from './auth.service';
import { BindInviteDto } from './dto/bind-invite.dto';
import { DevLoginDto } from './dto/wechat-login.dto';
import { CurrentUser, RequestUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('dev-login')
  async devLogin(@Body() dto: DevLoginDto) {
    return ok(await this.authService.devLogin(dto.openid));
  }

  @Post('bind-invite')
  @UseGuards(JwtAuthGuard)
  async bindInvite(@CurrentUser() user: RequestUser, @Body() dto: BindInviteDto) {
    return ok(await this.authService.bindInvite(user.id, dto.inviteCode));
  }
}
```

Write `apps/api/src/modules/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EditorGuard } from './editor.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'dev-secret',
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtAuthGuard, EditorGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, EditorGuard],
})
export class AuthModule {}
```

Modify `apps/api/src/app.module.ts` to import `AuthModule`.

- [ ] **Step 6: Verify and commit**

Run: `pnpm --filter @today-meal/api test:e2e -- auth.e2e-spec.ts`

Expected: PASS for invite binding.

Run: `pnpm --filter @today-meal/api typecheck`

Expected: no TypeScript errors.

```bash
git add apps/api/src/modules/auth apps/api/src/app.module.ts apps/api/test/auth.e2e-spec.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add editor authentication"
```

---

## Task 5: Menu, Tags, and Meal History API

**Files:**
- Create: `apps/api/src/modules/menu-items/*`
- Create: `apps/api/src/modules/tags/*`
- Create: `apps/api/src/modules/meal-history/*`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/menu-items.e2e-spec.ts`

- [ ] **Step 1: Write menu e2e tests first**

Write `apps/api/test/menu-items.e2e-spec.ts` with tests for:

```ts
it('allows public users to list active menu items', async () => {
  await request(app.getHttpServer()).get('/menu-items').expect(200);
});

it('rejects menu creation without an editor token', async () => {
  await request(app.getHttpServer()).post('/menu-items').send({ title: '番茄牛腩饭', type: 'recipe' }).expect(401);
});

it('allows editors to create recipe menu items', async () => {
  const token = await createEditorToken(app, prisma);
  await request(app.getHttpServer())
    .post('/menu-items')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: '番茄牛腩饭',
      type: 'recipe',
      mealPeriods: ['dinner'],
      tagNames: ['晚餐', '暖胃'],
      ingredients: ['牛腩', '番茄'],
      steps: ['焯水', '炖煮'],
      cookTimeMinutes: 90
    })
    .expect(201)
    .expect(({ body }) => {
      expect(body.data.title).toBe('番茄牛腩饭');
      expect(body.data.tags.map((tag: { name: string }) => tag.name)).toContain('暖胃');
    });
});
```

Include a local helper `createEditorToken(app, prisma)` in the test file that uses `/auth/dev-login` and `/auth/bind-invite`.

- [ ] **Step 2: Run failing menu tests**

Run: `pnpm --filter @today-meal/api test:e2e -- menu-items.e2e-spec.ts`

Expected: FAIL because menu modules do not exist.

- [ ] **Step 3: Implement DTOs**

Create `create-menu-item.dto.ts` with validated fields:

```ts
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';
import { MealPeriod, MenuItemType } from '@prisma/client';

export class CreateMenuItemDto {
  @IsEnum(MenuItemType)
  type!: MenuItemType;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverImageUrl?: string;

  @IsArray()
  @IsEnum(MealPeriod, { each: true })
  mealPeriods!: MealPeriod[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagNames?: string[];

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  steps?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  cookTimeMinutes?: number;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  restaurantName?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  externalUrl?: string;

  @IsOptional()
  @IsString()
  priceRange?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

Create update/list DTOs with the same field names and optional filters: `type`, `mealPeriod`, `tag`, `q`, `favorite`, `recentlyEaten`.

- [ ] **Step 4: Implement service behavior**

Implement `MenuItemsService` with:

```ts
async create(dto: CreateMenuItemDto, userId: string) {
  const tagNames = dto.tagNames ?? [];
  return this.prisma.menuItem.create({
    data: {
      type: dto.type,
      title: dto.title,
      subtitle: dto.subtitle,
      description: dto.description,
      coverImageUrl: dto.coverImageUrl,
      mealPeriods: dto.mealPeriods,
      isFavorite: dto.isFavorite ?? false,
      ingredients: dto.ingredients ?? [],
      steps: dto.steps ?? [],
      cookTimeMinutes: dto.cookTimeMinutes,
      difficulty: dto.difficulty,
      restaurantName: dto.restaurantName,
      platform: dto.platform,
      externalUrl: dto.externalUrl,
      priceRange: dto.priceRange,
      deliveryNotes: dto.deliveryNotes,
      sourceName: dto.sourceName,
      sourceUrl: dto.sourceUrl,
      notes: dto.notes,
      createdById: userId,
      updatedById: userId,
      tags: {
        create: tagNames.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { name },
              create: { name, type: 'custom' },
            },
          },
        })),
      },
    },
    include: { tags: { include: { tag: true } } },
  });
}
```

Add list, get by id, patch, archive delete, and favorite toggle using Prisma queries.

- [ ] **Step 5: Implement controllers and modules**

Routes:

- `GET /menu-items`: public.
- `GET /menu-items/:id`: public.
- `POST /menu-items`: `JwtAuthGuard` + `EditorGuard`.
- `PATCH /menu-items/:id`: `JwtAuthGuard` + `EditorGuard`.
- `DELETE /menu-items/:id`: `JwtAuthGuard` + `EditorGuard`, set `status` to `archived`.
- `POST /menu-items/:id/favorite`: `JwtAuthGuard` + `EditorGuard`.
- `GET /tags`: public.
- `POST /tags`: `JwtAuthGuard` + `EditorGuard`.
- `POST /meal-history`: `JwtAuthGuard` + `EditorGuard`.
- `GET /meal-history/recent`: public.

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm --filter @today-meal/api test:e2e -- menu-items.e2e-spec.ts
pnpm --filter @today-meal/api typecheck
```

Expected: menu e2e tests pass and typecheck has no errors.

```bash
git add apps/api/src/modules/menu-items apps/api/src/modules/tags apps/api/src/modules/meal-history apps/api/src/app.module.ts apps/api/test/menu-items.e2e-spec.ts
git commit -m "feat(api): add menu management"
```

---

## Task 6: Recommendation API

**Files:**
- Create: `apps/api/src/modules/recommendations/recommendations.module.ts`
- Create: `apps/api/src/modules/recommendations/recommendations.controller.ts`
- Create: `apps/api/src/modules/recommendations/recommendations.service.ts`
- Create: `apps/api/test/recommendations.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write recommendation tests first**

Write tests that seed three menu items:

- one dinner favorite with no recent history,
- one dinner item eaten yesterday,
- one breakfast item.

Assert:

```ts
expect(response.body.data.item.title).toBe('番茄牛腩饭');
expect(response.body.data.reason).toContain('晚餐');
```

for `POST /recommendations/random` with `{ "mealPeriod": "dinner" }`.

- [ ] **Step 2: Run failing recommendation tests**

Run: `pnpm --filter @today-meal/api test:e2e -- recommendations.e2e-spec.ts`

Expected: FAIL because recommendation module is missing.

- [ ] **Step 3: Implement recommendation service**

Use this deterministic scoring shape:

```ts
type Candidate = {
  id: string;
  title: string;
  isFavorite: boolean;
  mealPeriods: string[];
  mealHistories: { eatenAt: Date; rating: number | null }[];
};

function scoreCandidate(candidate: Candidate, mealPeriod?: string): number {
  let score = 1;
  if (mealPeriod && candidate.mealPeriods.includes(mealPeriod)) score += 5;
  if (candidate.isFavorite) score += 3;

  const lastHistory = candidate.mealHistories[0];
  if (lastHistory) {
    const daysSince = (Date.now() - lastHistory.eatenAt.getTime()) / 86400000;
    if (daysSince < 3) score -= 10;
    if (lastHistory.rating && lastHistory.rating >= 4) score += 2;
  }

  return score;
}
```

Select the highest score for `GET /recommendations/today` and weighted random for `POST /recommendations/random`. Return:

```ts
{
  item,
  reason: "匹配晚餐标签，且最近没有吃过"
}
```

- [ ] **Step 4: Implement controller**

Routes:

- `GET /recommendations/today?mealPeriod=dinner`
- `POST /recommendations/random` with body `{ mealPeriod?: MealPeriod; tagNames?: string[]; type?: MenuItemType }`

Both routes are public in MVP because browsing is public.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm --filter @today-meal/api test:e2e -- recommendations.e2e-spec.ts
pnpm --filter @today-meal/api typecheck
```

Expected: recommendation tests pass and typecheck has no errors.

```bash
git add apps/api/src/modules/recommendations apps/api/src/app.module.ts apps/api/test/recommendations.e2e-spec.ts
git commit -m "feat(api): add meal recommendations"
```

---

## Task 7: File Upload and Link Preview API

**Files:**
- Create: `apps/api/src/modules/files/*`
- Create: `apps/api/src/modules/link-preview/*`
- Create: `apps/api/test/files-link-preview.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/.env.example`

- [ ] **Step 1: Add dependencies**

Run:

```bash
pnpm --filter @today-meal/api add multer cheerio
pnpm --filter @today-meal/api add -D @types/multer
```

Expected: dependencies are installed.

- [ ] **Step 2: Write e2e tests first**

Test file upload rejects anonymous users:

```ts
await request(app.getHttpServer())
  .post('/files/upload')
  .attach('file', Buffer.from('fake-image'), 'dish.jpg')
  .expect(401);
```

Test link preview degrades gracefully:

```ts
await request(app.getHttpServer())
  .post('/link-preview')
  .send({ url: 'https://example.com/meal' })
  .expect(201)
  .expect(({ body }) => {
    expect(body.data.url).toBe('https://example.com/meal');
    expect(body.data.status).toMatch(/success|failed/);
  });
```

- [ ] **Step 3: Implement files module**

Use `FileInterceptor('file')`, validate MIME type starts with `image/`, write to `UPLOAD_DIR`, create `FileAsset`, and return:

```ts
{
  id: fileAsset.id,
  url: fileAsset.url,
  mimeType: fileAsset.mimeType,
  size: fileAsset.size
}
```

Store files under `apps/api/uploads/YYYY/MM/<random-name>.<ext>` in local development.

- [ ] **Step 4: Implement link preview module**

DTO:

```ts
export class LinkPreviewDto {
  @IsUrl({ require_protocol: true })
  url!: string;
}
```

Service behavior:

- Fetch the URL with a short timeout.
- Parse `og:title`, `og:image`, `title`, and description if available.
- Return `{ status: 'success', url, title, imageUrl, description }` when metadata exists.
- Return `{ status: 'failed', url, reason: '无法自动识别，可手动补全' }` when fetch or parsing fails.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm --filter @today-meal/api test:e2e -- files-link-preview.e2e-spec.ts
pnpm --filter @today-meal/api typecheck
```

Expected: file and link preview e2e tests pass.

```bash
git add apps/api/src/modules/files apps/api/src/modules/link-preview apps/api/src/app.module.ts apps/api/test/files-link-preview.e2e-spec.ts apps/api/.env.example apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add uploads and link previews"
```

---

## Task 8: Mini Program Foundation

**Files:**
- Create: `apps/miniapp/project.config.json`
- Create: `apps/miniapp/miniprogram/app.json`
- Create: `apps/miniapp/miniprogram/app.ts`
- Create: `apps/miniapp/miniprogram/app.wxss`
- Create: `apps/miniapp/miniprogram/sitemap.json`
- Create: `apps/miniapp/miniprogram/services/api.ts`
- Create: `apps/miniapp/miniprogram/services/auth.ts`
- Create: `apps/miniapp/miniprogram/styles/tokens.wxss`
- Create: `apps/miniapp/miniprogram/types/index.ts`

- [ ] **Step 1: Create mini program config**

Write `apps/miniapp/project.config.json`:

```json
{
  "miniprogramRoot": "miniprogram/",
  "compileType": "miniprogram",
  "setting": {
    "es6": true,
    "minified": true,
    "postcss": true
  },
  "appid": "touristappid",
  "projectname": "today-meal"
}
```

Write `apps/miniapp/miniprogram/app.json`:

```json
{
  "pages": [
    "pages/today/index",
    "pages/menu/index",
    "pages/menu-detail/index",
    "pages/menu-edit/index",
    "pages/profile/index"
  ],
  "window": {
    "navigationBarTitleText": "Today Meal",
    "navigationBarBackgroundColor": "#F8FAF7",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#F8FAF7"
  },
  "tabBar": {
    "color": "#7A8A7D",
    "selectedColor": "#111827",
    "backgroundColor": "#FFFFFF",
    "list": [
      { "pagePath": "pages/today/index", "text": "今天" },
      { "pagePath": "pages/menu/index", "text": "菜单" },
      { "pagePath": "pages/profile/index", "text": "我的" }
    ]
  },
  "sitemapLocation": "sitemap.json"
}
```

- [ ] **Step 2: Create global style tokens**

Write `apps/miniapp/miniprogram/styles/tokens.wxss`:

```css
page {
  --color-bg: #f8faf7;
  --color-card: #ffffff;
  --color-text: #17211b;
  --color-muted: #7a8a7d;
  --color-accent: #bef264;
  --color-accent-soft: #dcfce7;
  --radius-lg: 32rpx;
  --radius-xl: 48rpx;
  --shadow-card: 0 18rpx 60rpx rgba(15, 23, 42, 0.08);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
}
```

Write `apps/miniapp/miniprogram/app.wxss`:

```css
@import "./styles/tokens.wxss";

.page {
  min-height: 100vh;
  padding: 32rpx;
  box-sizing: border-box;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}
```

- [ ] **Step 3: Create API client**

Write `apps/miniapp/miniprogram/services/api.ts`:

```ts
const API_BASE_URL = 'http://localhost:3000';

export type RequestOptions<TBody> = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: TBody;
  token?: string;
};

export function request<TResponse, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${options.path}`,
      method: options.method ?? 'GET',
      data: options.body,
      header: {
        'content-type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve((response.data as { data: TResponse }).data);
        } else {
          reject(new Error(`Request failed: ${response.statusCode}`));
        }
      },
      fail: reject,
    });
  });
}
```

- [ ] **Step 4: Create auth service**

Write `apps/miniapp/miniprogram/services/auth.ts`:

```ts
import { request } from './api';

const TOKEN_KEY = 'today-meal-token';

export type LoginResult = {
  token: string;
  user: {
    id: string;
    openid: string;
    role: 'viewer' | 'editor' | 'owner';
  };
};

export function getToken(): string | undefined {
  return wx.getStorageSync(TOKEN_KEY) || undefined;
}

export function saveToken(token: string) {
  wx.setStorageSync(TOKEN_KEY, token);
}

export async function loginWithWechat(): Promise<LoginResult> {
  const login = await wx.login();
  const result = await request<LoginResult, { code: string }>({
    path: '/auth/wechat-login',
    method: 'POST',
    body: { code: login.code },
  });
  saveToken(result.token);
  return result;
}

export async function bindInvite(inviteCode: string) {
  const token = getToken();
  return request<{ role: string }, { inviteCode: string }>({
    path: '/auth/bind-invite',
    method: 'POST',
    token,
    body: { inviteCode },
  });
}
```

- [ ] **Step 5: Verify manually in WeChat DevTools**

Open `apps/miniapp` in WeChat DevTools.

Expected: project loads with no missing `app.json` or sitemap errors.

- [ ] **Step 6: Commit**

```bash
git add apps/miniapp
git commit -m "feat(miniapp): add app foundation"
```

---

## Task 9: Mini Program Pages and Flows

**Files:**
- Create: `apps/miniapp/miniprogram/pages/today/*`
- Create: `apps/miniapp/miniprogram/pages/menu/*`
- Create: `apps/miniapp/miniprogram/pages/menu-detail/*`
- Create: `apps/miniapp/miniprogram/pages/menu-edit/*`
- Create: `apps/miniapp/miniprogram/pages/profile/*`
- Create: `apps/miniapp/miniprogram/components/menu-card/*`
- Create: `apps/miniapp/miniprogram/components/tag-filter/*`

- [ ] **Step 1: Implement reusable menu card**

Create `components/menu-card/index.wxml`:

```xml
<view class="menu-card" bindtap="handleTap">
  <image wx:if="{{item.coverImageUrl}}" class="cover" src="{{item.coverImageUrl}}" mode="aspectFill" />
  <view wx:else class="cover empty-cover">Today Meal</view>
  <view class="body">
    <view class="title">{{item.title}}</view>
    <view class="subtitle">{{item.subtitle}}</view>
    <view class="tags">
      <text wx:for="{{item.tags}}" wx:key="name" class="tag">{{item.name}}</text>
    </view>
  </view>
</view>
```

Create matching `.wxss`, `.ts`, and `.json`. The `handleTap` method navigates to `/pages/menu-detail/index?id={{item.id}}`.

- [ ] **Step 2: Implement Today page**

Today page calls:

- `GET /recommendations/today`
- `GET /menu-items?limit=10`
- `POST /recommendations/random`

Use this page state:

```ts
type TodayPageData = {
  recommendation?: {
    item: MenuItemView;
    reason: string;
  };
  menuItems: MenuItemView[];
  drawing: boolean;
};
```

The “抽一下” action sets `drawing: true`, waits 450ms for animation, calls random API, then sets `drawing: false`.

- [ ] **Step 3: Implement Menu page**

Menu page state:

```ts
type MenuPageData = {
  q: string;
  activeType: 'all' | 'recipe' | 'takeout' | 'inspiration';
  activeMealPeriod: 'all' | 'breakfast' | 'lunch' | 'dinner' | 'lateNight';
  items: MenuItemView[];
};
```

On filter changes, call `GET /menu-items` with query parameters. Show empty state text: `还没有这个分类的菜单，去添加一个吧。`

- [ ] **Step 4: Implement Detail page**

Detail page loads `GET /menu-items/:id` and renders by type:

- recipe: ingredients, steps, cook time, difficulty.
- takeout: restaurant, platform, price, link button.
- inspiration: source and notes.

Actions:

- favorite: `POST /menu-items/:id/favorite`.
- mark eaten: `POST /meal-history`.
- edit: navigate to edit page.
- external link: copy URL with `wx.setClipboardData` when direct jump is unavailable.

- [ ] **Step 5: Implement Edit page**

Edit page supports `type=recipe`, `type=takeout`, and `type=inspiration`.

For takeout:

1. User pastes link.
2. Call `POST /link-preview`.
3. If success, prefill title and image.
4. If failed, show `没自动识别出来，可以手动补一下。`

For recipe:

1. User chooses image with `wx.chooseMedia`.
2. Upload with `POST /files/upload`.
3. Fill recipe fields.
4. Submit `POST /menu-items` or `PATCH /menu-items/:id`.

- [ ] **Step 6: Implement Profile page**

Profile page shows:

- login state,
- role,
- invite code binding input,
- recent meal history,
- simple stats: recently eaten count and favorite count.

Bind invite calls `bindInvite(inviteCode)` and shows success toast.

- [ ] **Step 7: Manual mini program verification**

In WeChat DevTools, verify:

- `今天` tab loads recommendation and menu cards.
- `菜单` tab filters by type and meal period.
- Detail page opens from a card.
- Edit page creates a recipe and a takeout item.
- Profile page binds invite code.

- [ ] **Step 8: Commit**

```bash
git add apps/miniapp/miniprogram
git commit -m "feat(miniapp): add menu browsing flows"
```

---

## Task 10: Deployment Documentation and Production Compose

**Files:**
- Modify: `docker-compose.yml`
- Create: `Dockerfile.api`
- Create: `Caddyfile.example`
- Create: `docs/deployment.md`
- Create: `apps/api/.env.production.example`

- [ ] **Step 1: Add API Dockerfile**

Write `Dockerfile.api`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @today-meal/shared build
RUN pnpm --filter @today-meal/api build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/node_modules node_modules
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
```

- [ ] **Step 2: Extend Docker Compose**

Update `docker-compose.yml` with `api` service:

```yaml
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    env_file:
      - apps/api/.env
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    volumes:
      - ./apps/api/uploads:/app/apps/api/uploads
```

- [ ] **Step 3: Add reverse proxy example**

Write `Caddyfile.example`:

```caddyfile
api.today-meal.example.com {
  reverse_proxy api:3000
}
```

Write `apps/api/.env.production.example`:

```dotenv
DATABASE_URL="postgresql://today_meal:use-a-strong-password@postgres:5432/today_meal?schema=public"
JWT_SECRET="production-secret-at-least-32-characters-long"
WECHAT_APP_ID="production-wechat-mini-program-app-id"
WECHAT_APP_SECRET="production-wechat-mini-program-app-secret"
EDITOR_INVITE_CODE="production-invite-code"
OWNER_OPENIDS="owner-openid-1,owner-openid-2"
UPLOAD_DIR="./uploads"
PUBLIC_BASE_URL="https://api.today-meal.example.com"
```

- [ ] **Step 4: Write deployment docs**

Write `docs/deployment.md` with:

````md
# Today Meal Deployment

## Server Requirements

- Docker and Docker Compose
- A domain with HTTPS
- WeChat Mini Program request domain configured to the API HTTPS domain

## Environment

Copy `apps/api/.env.production.example` to `apps/api/.env` and fill values.

## Start

Run:

```bash
docker compose up -d --build
docker compose exec api pnpm --filter @today-meal/api prisma migrate deploy
```

## Verify

Open:

```text
https://api.today-meal.example.com/health
```

Expected:

```json
{"data":{"status":"ok"}}
```
````

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm build
pnpm test
```

Expected: all workspace builds and tests pass.

```bash
git add Dockerfile.api docker-compose.yml Caddyfile.example docs/deployment.md apps/api/.env.production.example
git commit -m "docs: add deployment guide"
```

---

## Final Verification

- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm --filter @today-meal/api test:e2e`.
- [ ] Start local database with `docker compose up -d postgres`.
- [ ] Start API with `pnpm dev:api`.
- [ ] Verify `GET http://localhost:3000/health`.
- [ ] Open `apps/miniapp` in WeChat DevTools.
- [ ] Create one recipe, one takeout item, and one inspiration item.
- [ ] Mark a menu item eaten with rating.
- [ ] Verify random recommendation avoids the recently eaten item when another candidate exists.
- [ ] Verify takeout link preview failure still allows manual save.

## Spec Coverage Review

- Product positioning and clean magazine UI are covered in Tasks 8 and 9.
- Backend service, PostgreSQL schema, and deployment are covered in Tasks 2, 3, 10.
- Public browsing and editor permissions are covered in Task 4 and Task 5.
- Menu types, images, tags, and meal history are covered in Tasks 5, 7, 9.
- Light smart random recommendation is covered in Task 6 and Task 9.
- Takeout link preview with graceful failure is covered in Task 7 and Task 9.
- Testing expectations are covered in each backend task and final verification.
