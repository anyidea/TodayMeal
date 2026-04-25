import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function createEditorToken(
  app: INestApplication,
  prisma: PrismaService,
): Promise<string> {
  await prisma.user.upsert({
    where: { openid: 'editor-openid' },
    update: { role: 'viewer' },
    create: { openid: 'editor-openid', role: 'viewer' },
  });

  const login = await request(app.getHttpServer())
    .post('/auth/dev-login')
    .send({ openid: 'editor-openid' })
    .expect(201);

  const token = login.body.data.token as string;

  await request(app.getHttpServer())
    .post('/auth/bind-invite')
    .set('Authorization', `Bearer ${token}`)
    .send({ inviteCode: 'invite-123' })
    .expect(201);

  return token;
}

describe('Menu items', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.EDITOR_INVITE_CODE = 'invite-123';
    process.env.OWNER_OPENIDS = 'owner-openid';
    process.env.ENABLE_DEV_LOGIN = 'true';
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DEV_LOGIN = 'true';
    process.env.EDITOR_INVITE_CODE = 'invite-123';
    process.env.OWNER_OPENIDS = 'owner-openid';

    await prisma.mealHistory.deleteMany();
    await prisma.menuItemTag.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows public users to list active menu items', async () => {
    await request(app.getHttpServer()).get('/menu-items').expect(200);
  });

  it('rejects menu creation without an editor token', async () => {
    await request(app.getHttpServer())
      .post('/menu-items')
      .send({ title: '番茄牛腩饭', type: 'recipe' })
      .expect(401);
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
        cookTimeMinutes: 90,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.title).toBe('番茄牛腩饭');
        expect(
          body.data.tags.map((tag: { name: string }) => tag.name),
        ).toContain('暖胃');
      });
  });

  it('hides archived menu item details from public users', async () => {
    const token = await createEditorToken(app, prisma);
    const created = await request(app.getHttpServer())
      .post('/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '已归档菜单',
        type: 'recipe',
        mealPeriods: ['lunch'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/menu-items/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/menu-items/${created.body.data.id}`)
      .expect(404);
  });

  it('requires editors to toggle favorite and changes favorite status', async () => {
    const token = await createEditorToken(app, prisma);
    const created = await request(app.getHttpServer())
      .post('/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '收藏菜单',
        type: 'recipe',
        mealPeriods: ['dinner'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/menu-items/${created.body.data.id}/favorite`)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/menu-items/${created.body.data.id}/favorite`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.isFavorite).toBe(true);
      });
  });

  it('records meal history and returns recent history publicly', async () => {
    const token = await createEditorToken(app, prisma);
    const created = await request(app.getHttpServer())
      .post('/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '历史菜单',
        type: 'recipe',
        mealPeriods: ['dinner'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/meal-history')
      .set('Authorization', `Bearer ${token}`)
      .send({
        menuItemId: created.body.data.id,
        eatenAt: '2026-04-25T10:00:00.000Z',
        rating: 5,
        note: '很好吃',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.rating).toBe(5);
        expect(body.data.note).toBe('很好吃');
      });

    await request(app.getHttpServer())
      .get('/meal-history/recent')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data[0].note).toBe('很好吃');
        expect(body.data[0].menuItem.title).toBe('历史菜单');
      });
  });

  it('returns created custom tags', async () => {
    const token = await createEditorToken(app, prisma);

    await request(app.getHttpServer())
      .post('/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '暖胃', color: '#ff8800' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/tags')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.map((tag: { name: string }) => tag.name)).toContain(
          '暖胃',
        );
      });
  });
});
