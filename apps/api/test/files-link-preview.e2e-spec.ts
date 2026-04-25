import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as dns from 'node:dns/promises';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { fetch as undiciFetch } from 'undici';
import { AppModule } from '../src/app.module';
import { configureApiApplication } from '../src/configure-api-application';
import { PrismaService } from '../src/prisma/prisma.service';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));
jest.mock('undici', () => {
  const actual = jest.requireActual('undici') as typeof import('undici');
  return {
    ...actual,
    fetch: jest.fn(),
  };
});

async function createEditorToken(
  app: NestExpressApplication,
  prisma: PrismaService,
): Promise<string> {
  await prisma.user.upsert({
    where: { openid: 'file-editor-openid' },
    update: { role: 'viewer' },
    create: { openid: 'file-editor-openid', role: 'viewer' },
  });

  const login = await request(app.getHttpServer())
    .post('/auth/dev-login')
    .send({ openid: 'file-editor-openid' })
    .expect(201);

  const token = login.body.data.token as string;

  await request(app.getHttpServer())
    .post('/auth/bind-invite')
    .set('Authorization', `Bearer ${token}`)
    .send({ inviteCode: 'invite-123' })
    .expect(201);

  return token;
}

const tinyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]);
const tinyGif = Buffer.from('GIF89a');

describe('Files and link preview', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let uploadDir: string;

  beforeAll(async () => {
    uploadDir = path.join(tmpdir(), `today-meal-api-uploads-${Date.now()}`);
    await mkdir(uploadDir, { recursive: true });

    process.env.JWT_SECRET = 'test-secret';
    process.env.EDITOR_INVITE_CODE = 'invite-123';
    process.env.OWNER_OPENIDS = 'owner-openid';
    process.env.ENABLE_DEV_LOGIN = 'true';
    process.env.NODE_ENV = 'test';
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PUBLIC_BASE_URL = 'https://static.example.test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApiApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    (dns.lookup as jest.MockedFunction<typeof dns.lookup>).mockResolvedValue([
      {
        address: '93.184.216.34',
        family: 4,
      },
    ] as never);
    await prisma.fileAsset.deleteMany();
    await prisma.mealHistory.deleteMany();
    await prisma.menuItemTag.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
    await rm(uploadDir, { force: true, recursive: true });
  });

  it('rejects anonymous file uploads', async () => {
    await request(app.getHttpServer())
      .post('/files/upload')
      .attach('file', Buffer.from('fake-image'), 'dish.jpg')
      .expect(401);
  });

  it('allows editors to upload a small image', async () => {
    const token = await createEditorToken(app, prisma);

    let uploadedPath = '';

    await request(app.getHttpServer())
      .post('/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyJpeg, {
        filename: 'dish.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.id).toEqual(expect.any(String));
        expect(body.data.url).toMatch(
          /^https:\/\/static\.example\.test\/uploads\/\d{4}\/\d{2}\/.+\.jpg$/,
        );
        expect(body.data.mimeType).toBe('image/jpeg');
        expect(body.data.size).toBe(tinyJpeg.byteLength);
        uploadedPath = new URL(body.data.url).pathname;
      });

    await request(app.getHttpServer())
      .get(uploadedPath)
      .expect(200)
      .expect('Content-Type', /image\/jpeg/);

    await expect(prisma.fileAsset.count()).resolves.toBe(1);
  });

  it('rejects uploads over five megabytes', async () => {
    const token = await createEditorToken(app, prisma);
    const largeJpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.alloc(5 * 1024 * 1024 + 1),
    ]);

    await request(app.getHttpServer())
      .post('/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', largeJpeg, {
        filename: 'huge.jpg',
        contentType: 'image/jpeg',
      })
      .expect(({ status }) => {
        expect([400, 413]).toContain(status);
      });

    await expect(prisma.fileAsset.count()).resolves.toBe(0);
  });

  it('rejects fake image content with an image MIME type', async () => {
    const token = await createEditorToken(app, prisma);

    await request(app.getHttpServer())
      .post('/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-image'), {
        filename: 'dish.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    await expect(prisma.fileAsset.count()).resolves.toBe(0);
  });

  it('derives upload extensions from validated MIME type instead of original filename', async () => {
    const token = await createEditorToken(app, prisma);

    await request(app.getHttpServer())
      .post('/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyGif, {
        filename: 'x.html',
        contentType: 'image/gif',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.url).toMatch(/\.gif$/);
        expect(body.data.url).not.toMatch(/\.html$/);
        expect(body.data.mimeType).toBe('image/gif');
      });
  });

  it('degrades link preview gracefully when metadata cannot be fetched', async () => {
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockRejectedValue(
      new Error('network unavailable') as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'https://example.com/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.url).toBe('https://example.com/meal');
        expect(body.data.status).toMatch(/success|failed/);
      });
  });

  it('parses mocked HTML metadata for link previews', async () => {
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockResolvedValue(
      new Response(
        `
          <html>
            <head>
              <meta property="og:title" content="红烧牛肉面" />
              <meta property="og:image" content="https://example.com/beef.jpg" />
              <meta name="description" content="适合晚餐的热汤面" />
              <title>备用标题</title>
            </head>
          </html>
        `,
        {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        },
      ) as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'https://example.com/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toMatchObject({
          status: 'success',
          url: 'https://example.com/meal',
          title: '红烧牛肉面',
          imageUrl: 'https://example.com/beef.jpg',
          description: '适合晚餐的热汤面',
        });
      });
  });

  it('parses a Meituan takeout link into normalized takeout fields', async () => {
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockResolvedValue(
      new Response(
        `
          <html>
            <head>
              <meta property="og:title" content="太二酸菜鱼（万象城店） - 酸菜鱼双人餐 ¥88" />
              <meta property="og:image" content="https://example.com/fish.jpg" />
              <meta name="description" content="美团外卖，约30分钟送达" />
              <title>备用标题</title>
            </head>
          </html>
        `,
        {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        },
      ) as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview/takeout')
      .send({ url: 'https://waimai.meituan.com/meal?id=123' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toMatchObject({
          status: 'success',
          platform: 'meituan',
          platformLabel: '美团',
          externalUrl: 'https://waimai.meituan.com/meal?id=123',
          restaurantName: '太二酸菜鱼（万象城店）',
          title: '酸菜鱼双人餐',
          priceRange: '¥88',
          coverImageUrl: 'https://example.com/fish.jpg',
          description: '美团外卖，约30分钟送达',
        });
      });
  });

  it('recognizes Taobao instant commerce links and preserves data on weak metadata', async () => {
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockResolvedValue(
      new Response(
        `
          <html>
            <head>
              <title>鲜奶茶 - 茶百道</title>
            </head>
          </html>
        `,
        {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        },
      ) as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview/takeout')
      .send({ url: 'https://taobao.com/shanguo/item?id=456' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toMatchObject({
          status: 'success',
          platform: 'taobao_flash',
          platformLabel: '淘宝闪购',
          externalUrl: 'https://taobao.com/shanguo/item?id=456',
          restaurantName: '茶百道',
          title: '鲜奶茶',
        });
      });
  });

  it('degrades link preview for loopback URLs', async () => {
    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'http://127.0.0.1/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toEqual({
          status: 'failed',
          url: 'http://127.0.0.1/meal',
          reason: '无法自动识别，可手动补全',
        });
      });
  });

  it('degrades link preview for localhost URLs', async () => {
    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'http://localhost/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toEqual({
          status: 'failed',
          url: 'http://localhost/meal',
          reason: '无法自动识别，可手动补全',
        });
      });
  });

  it('degrades link preview for IPv4-mapped IPv6 loopback URL literals', async () => {
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockResolvedValue(
      new Response('<html><title>Private Meal</title></html>', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      }) as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'http://[::ffff:127.0.0.1]/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toEqual({
          status: 'failed',
          url: 'http://[::ffff:127.0.0.1]/meal',
          reason: '无法自动识别，可手动补全',
        });
        expect(undiciFetch).not.toHaveBeenCalled();
      });
  });

  it('degrades link preview for IPv6 link-local URL literals across fe80::/10', async () => {
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockResolvedValue(
      new Response('<html><title>Link Local Meal</title></html>', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      }) as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'http://[fe81::1]/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toEqual({
          status: 'failed',
          url: 'http://[fe81::1]/meal',
          reason: '无法自动识别，可手动补全',
        });
        expect(undiciFetch).not.toHaveBeenCalled();
      });
  });

  it('degrades link preview for DNS results with IPv4-mapped IPv6 loopback', async () => {
    (dns.lookup as jest.MockedFunction<typeof dns.lookup>).mockResolvedValue([
      {
        address: '::ffff:127.0.0.1',
        family: 6,
      },
    ] as never);
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockResolvedValue(
      new Response('<html><title>Private Meal</title></html>', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      }) as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'https://example.com/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toEqual({
          status: 'failed',
          url: 'https://example.com/meal',
          reason: '无法自动识别，可手动补全',
        });
        expect(undiciFetch).not.toHaveBeenCalled();
      });
  });

  it('binds link preview fetches to the prevalidated DNS result', async () => {
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockResolvedValue(
      new Response('<html><title>Safe Meal</title></html>', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      }) as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'https://example.com/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.status).toBe('success');
        expect(body.data.title).toBe('Safe Meal');
        expect(undiciFetch).toHaveBeenCalledTimes(1);
        expect(undiciFetch).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            dispatcher: expect.any(Object),
            redirect: 'manual',
          }),
        );
      });
  });

  it('degrades link preview when a redirect points to localhost', async () => {
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          location: 'http://localhost/private',
        },
      }) as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'https://example.com/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toEqual({
          status: 'failed',
          url: 'https://example.com/meal',
          reason: '无法自动识别，可手动补全',
        });
      });
  });

  it('degrades link preview for over-size HTML responses', async () => {
    (undiciFetch as jest.MockedFunction<typeof undiciFetch>).mockResolvedValue(
      new Response(`${'x'.repeat(256 * 1024 + 1)}<title>Huge Meal</title>`, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      }) as never,
    );

    await request(app.getHttpServer())
      .post('/link-preview')
      .send({ url: 'https://example.com/meal' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toEqual({
          status: 'failed',
          url: 'https://example.com/meal',
          reason: '无法自动识别，可手动补全',
        });
      });
  });
});
