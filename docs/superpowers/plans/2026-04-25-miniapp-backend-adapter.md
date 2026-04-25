# Miniapp Backend Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TodayMeal miniapp mock/local-only data with backend-backed APIs that match the current miniapp pages, including login, recipes, takeout favorites, recommendations, history, profile stats, and OSS image upload.

**Architecture:** Keep the existing NestJS + Prisma API as the source of truth. Add a thin miniapp API client with JWT handling, then wire pages to existing and new endpoints. Use Alibaba Cloud OSS signed direct upload for production images, while preserving the existing server-side multipart upload as a local/dev fallback.

**Tech Stack:** NestJS 11, Prisma/PostgreSQL, WeChat Mini Program TypeScript, `wx.request`, `wx.uploadFile`, Alibaba Cloud OSS POST policy/signature, Jest e2e tests.

---

## File Structure

- Modify: `apps/api/prisma/schema.prisma` only if user ownership or stats require fields not already covered.
- Modify: `apps/api/src/modules/menu-items/*` to enforce user-scoped data and support recipe/takeout list needs.
- Modify: `apps/api/src/modules/recommendations/*` to accept current filter chips and return result-page friendly payloads.
- Modify: `apps/api/src/modules/files/*` to add OSS signed upload policy and confirm endpoints.
- Create: `apps/api/src/modules/profile/profile.controller.ts` and `profile.service.ts` for miniapp profile summary.
- Modify: `apps/api/src/app.module.ts` to register `ProfileModule` if created.
- Create: `apps/miniapp/miniprogram/utils/api.ts` for base URL, token, request wrapper, and typed helpers.
- Create: `apps/miniapp/miniprogram/utils/auth.ts` for `wx.login`, token storage, and optional invite binding.
- Create: `apps/miniapp/miniprogram/utils/upload.ts` for OSS direct upload.
- Modify: miniapp pages under `apps/miniapp/miniprogram/pages/*` to replace mock data with API calls.
- Test: `apps/api/test/*.e2e-spec.ts` with endpoint-first tests for each backend behavior.

---

### Task 1: API Client And Miniapp Login

**Files:**
- Create: `apps/miniapp/miniprogram/utils/api.ts`
- Create: `apps/miniapp/miniprogram/utils/auth.ts`
- Modify: `apps/miniapp/miniprogram/app.ts`
- Test manually in WeChat DevTools.

- [ ] **Step 1: Add request wrapper**

Create `utils/api.ts` with:

```ts
const tokenKey = "todayMeal.authToken";
const apiBaseUrl = "http://localhost:3000";

type ApiResponse<T> = {
  data: T;
};

export function getToken(): string {
  return wx.getStorageSync(tokenKey) || "";
}

export function setToken(token: string) {
  wx.setStorageSync(tokenKey, token);
}

export function request<T>(options: {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  data?: unknown;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBaseUrl}${options.url}`,
      method: options.method || "GET",
      data: options.data,
      header: {
        Authorization: getToken() ? `Bearer ${getToken()}` : "",
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve((res.data as ApiResponse<T>).data);
          return;
        }

        reject(res);
      },
      fail: reject,
    });
  });
}
```

- [ ] **Step 2: Add login helper**

Create `utils/auth.ts`:

```ts
import { request, setToken } from "./api";

type LoginResult = {
  token: string;
  user: {
    id: string;
    openid: string;
    role: "viewer" | "editor" | "owner";
  };
};

export function login(): Promise<LoginResult> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async ({ code }) => {
        try {
          const result = await request<LoginResult>({
            url: "/auth/wechat-login",
            method: "POST",
            data: { code },
          });
          setToken(result.token);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      fail: reject,
    });
  });
}
```

- [ ] **Step 3: Initialize login in app**

Modify `app.ts`:

```ts
import { login } from "./utils/auth";

App({
  globalData: {},
  onLaunch() {
    login().catch(() => {
      wx.showToast({ title: "登录失败，请稍后重试", icon: "none" });
    });
  },
});
```

---

### Task 2: User-Scoped Menu Items

**Files:**
- Modify: `apps/api/src/modules/menu-items/menu-items.controller.ts`
- Modify: `apps/api/src/modules/menu-items/menu-items.service.ts`
- Modify/Test: `apps/api/test/menu-items.e2e-spec.ts`

- [ ] **Step 1: Write failing e2e test**

Add a test proving a user only sees their own `MenuItem` records from `GET /menu-items`.

Expected failure before implementation: both users see all records.

- [ ] **Step 2: Require auth for list and detail**

Change controller:

```ts
@UseGuards(JwtAuthGuard)
@Get()
async list(@CurrentUser() user: RequestUser, @Query() query: ListMenuItemsDto) {
  return ok(await this.menuItemsService.list(query, user.id));
}
```

Change service signature and `where`:

```ts
async list(query: ListMenuItemsDto, userId: string) {
  const where: Prisma.MenuItemWhereInput = {
    status: "active",
    createdById: userId,
  };
  // keep existing filters
}
```

- [ ] **Step 3: Apply the same ownership check to detail/update/archive/favorite**

`ensureActive(id, userId)` must require both `id` and `createdById`.

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm --filter @today-meal/api test:e2e -- menu-items.e2e-spec.ts
pnpm --filter @today-meal/api typecheck
```

Expected: all menu item tests pass.

---

### Task 3: Recipes API Integration

**Files:**
- Modify: `apps/miniapp/miniprogram/pages/recipes/recipes.ts`
- Modify: `apps/miniapp/miniprogram/pages/add-recipe/add-recipe.wxml`
- Modify: `apps/miniapp/miniprogram/pages/add-recipe/add-recipe.ts`

- [ ] **Step 1: Load recipes from backend**

Use:

```ts
request<MenuItem[]>({ url: "/menu-items?type=recipe" });
```

Map API response to existing card fields:

```ts
{
  name: item.title,
  meta: item.subtitle || item.tags.map((tag) => tag.name).join("  "),
  time: item.cookTimeMinutes ? `${item.cookTimeMinutes}分钟` : "未设置",
  likes: 0,
  image: item.coverImageUrl,
}
```

- [ ] **Step 2: Bind add recipe form**

Replace static unbound inputs with `form` state fields:

```ts
form: {
  title: "",
  subtitle: "",
  tagNames: [],
  ingredients: [],
  steps: [],
  cookTimeMinutes: "",
  coverImageUrl: "",
  notes: "",
}
```

- [ ] **Step 3: Save recipe through backend**

Call:

```ts
request({
  url: "/menu-items",
  method: "POST",
  data: {
    type: "recipe",
    title: form.title,
    subtitle: form.subtitle,
    mealPeriods: ["lunch", "dinner"],
    tagNames: form.tagNames,
    ingredients: form.ingredients,
    steps: form.steps,
    cookTimeMinutes: Number(form.cookTimeMinutes) || undefined,
    coverImageUrl: form.coverImageUrl || undefined,
    notes: form.notes || undefined,
  },
});
```

---

### Task 4: Takeout Backend Integration

**Files:**
- Modify: `apps/miniapp/miniprogram/pages/add-takeout/add-takeout.ts`
- Modify: `apps/miniapp/miniprogram/pages/favorites/favorites.ts`

- [ ] **Step 1: Replace hardcoded API URL**

Replace `http://localhost:3000` in `add-takeout.ts` with `request()` from `utils/api.ts`:

```ts
const data = await request<TakeoutPreviewResponse>({
  url: "/link-preview/takeout",
  method: "POST",
  data: { url },
});
```

- [ ] **Step 2: Save takeout to `/menu-items`**

Instead of `wx.setStorageSync`, call:

```ts
request({
  url: "/menu-items",
  method: "POST",
  data: {
    type: "takeout",
    title: form.title,
    subtitle: form.restaurantName,
    restaurantName: form.restaurantName,
    platform: form.platform,
    externalUrl: form.externalUrl,
    priceRange: form.priceRange,
    coverImageUrl: form.coverImageUrl,
    notes: form.notes,
    mealPeriods: ["lunch", "dinner"],
    tagNames: [form.platformLabel || "外卖"].filter(Boolean),
    isFavorite: true,
  },
});
```

- [ ] **Step 3: Load favorites from backend**

Use:

```ts
request<MenuItem[]>({ url: "/menu-items?type=takeout" });
```

Map to existing card fields and keep `externalUrl`.

---

### Task 5: OSS Direct Upload

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/modules/files/dto/create-upload-policy.dto.ts`
- Modify: `apps/api/src/modules/files/files.controller.ts`
- Modify: `apps/api/src/modules/files/files.service.ts`
- Create: `apps/miniapp/miniprogram/utils/upload.ts`
- Test: `apps/api/test/files-link-preview.e2e-spec.ts`

- [ ] **Step 1: Add backend tests for upload policy**

Test:

```ts
await request(app.getHttpServer())
  .post("/files/upload-policy")
  .set("Authorization", `Bearer ${token}`)
  .send({ mimeType: "image/jpeg", size: 1024, fileName: "dish.jpg" })
  .expect(201)
  .expect(({ body }) => {
    expect(body.data.uploadUrl).toEqual(expect.any(String));
    expect(body.data.fileUrl).toEqual(expect.any(String));
    expect(body.data.formData.key).toMatch(/^uploads\/\d{4}\/\d{2}\//);
  });
```

- [ ] **Step 2: Add OSS config variables**

Use:

```env
STORAGE_DRIVER=oss
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=today-meal
OSS_ENDPOINT=https://today-meal.oss-cn-hangzhou.aliyuncs.com
OSS_PUBLIC_BASE_URL=https://cdn.example.com
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
```

- [ ] **Step 3: Implement signed POST policy**

`FilesService.createUploadPolicy()` returns:

```ts
{
  uploadUrl: "https://bucket.oss-cn-hangzhou.aliyuncs.com",
  fileUrl: "https://cdn.example.com/uploads/2026/04/uuid.jpg",
  storageKey: "uploads/2026/04/uuid.jpg",
  formData: {
    key: "...",
    policy: "...",
    OSSAccessKeyId: "...",
    signature: "...",
    success_action_status: "200",
  },
}
```

- [ ] **Step 4: Confirm file after upload**

Add `POST /files/confirm` with body:

```json
{
  "storageKey": "uploads/2026/04/uuid.jpg",
  "url": "https://cdn.example.com/uploads/2026/04/uuid.jpg",
  "mimeType": "image/jpeg",
  "size": 1024
}
```

The endpoint creates `FileAsset` and returns `{ id, url, mimeType, size }`.

- [ ] **Step 5: Miniapp upload helper**

Create `utils/upload.ts`:

```ts
import { request } from "./api";

export async function uploadImage(filePath: string, meta: { mimeType: string; size: number }) {
  const policy = await request<any>({
    url: "/files/upload-policy",
    method: "POST",
    data: meta,
  });

  await new Promise((resolve, reject) => {
    wx.uploadFile({
      url: policy.uploadUrl,
      filePath,
      name: "file",
      formData: policy.formData,
      success: resolve,
      fail: reject,
    });
  });

  return request<{ url: string }>({
    url: "/files/confirm",
    method: "POST",
    data: {
      storageKey: policy.storageKey,
      url: policy.fileUrl,
      mimeType: meta.mimeType,
      size: meta.size,
    },
  });
}
```

---

### Task 6: Recommendations And Filter Wiring

**Files:**
- Modify: `apps/api/src/modules/recommendations/recommendations.controller.ts`
- Modify: `apps/api/src/modules/recommendations/recommendations.service.ts`
- Modify: `apps/miniapp/miniprogram/pages/filter/filter.ts`
- Modify: `apps/miniapp/miniprogram/pages/result/result.ts`
- Modify: `apps/miniapp/miniprogram/pages/home/home.ts`

- [ ] **Step 1: Pass filter chips to result**

When tapping `完成筛选`, build:

```ts
{
  type: "recipe",
  tagNames: ["家常菜", "香辣", "煎炒", "肉类"],
  mealPeriod: "dinner"
}
```

Store with `wx.setStorageSync("todayMeal.recommendationFilters", filters)`.

- [ ] **Step 2: Result calls backend**

Call:

```ts
request({
  url: "/recommendations/random",
  method: "POST",
  data: filters,
});
```

- [ ] **Step 3: Home today inspiration**

Call `GET /recommendations/today` and show returned item. If `404`, show empty state inviting user to add recipes/takeout.

---

### Task 7: Meal History And Profile Summary

**Files:**
- Create: `apps/api/src/modules/profile/profile.module.ts`
- Create: `apps/api/src/modules/profile/profile.controller.ts`
- Create: `apps/api/src/modules/profile/profile.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/miniapp/miniprogram/pages/profile/profile.ts`
- Modify: `apps/miniapp/miniprogram/pages/result/result.ts`

- [ ] **Step 1: Add `GET /profile/summary` e2e test**

Expected response:

```json
{
  "recipeCount": 3,
  "takeoutCount": 2,
  "favoriteCount": 4,
  "recentMealCount": 5
}
```

- [ ] **Step 2: Implement profile module**

Use Prisma counts scoped by `createdById`.

- [ ] **Step 3: Record eaten meal from result**

When user taps “吃过/收藏” style action, call:

```ts
request({
  url: "/meal-history",
  method: "POST",
  data: { menuItemId: item.id, eatenAt: new Date().toISOString() },
});
```

---

## Verification

- [ ] Run backend typecheck:

```bash
pnpm --filter @today-meal/api typecheck
```

- [ ] Run backend e2e:

```bash
pnpm --filter @today-meal/api test:e2e
```

- [ ] Read lints for changed miniapp files.

- [ ] Manual miniapp smoke test:
  - Login succeeds.
  - Add recipe with image.
  - Add takeout from link.
  - Recipe list and takeout list reload from backend.
  - Filter result calls backend.
  - Profile stats update.

---

## Notes

- OSS is the production storage target. Keep `POST /files/upload` for local development and automated tests unless it becomes a maintenance burden.
- WeChat Mini Program production must configure HTTPS API domain and OSS/CDN upload/download domains in the WeChat console.
- Viewer/editor role behavior matters. MVP can make the app owner an `owner` through `OWNER_OPENIDS`, then add an invite flow later if needed.
