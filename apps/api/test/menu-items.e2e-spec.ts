import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function createEditorToken(
  app: INestApplication,
  prisma: PrismaService,
  openid = 'editor-openid',
): Promise<string> {
  await prisma.user.upsert({
    where: { openid },
    update: { role: 'viewer' },
    create: { openid, role: 'viewer' },
  });

  const login = await request(app.getHttpServer())
    .post('/auth/dev-login')
    .send({ openid })
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

    await prisma.mealGroupInvite.deleteMany();
    await prisma.mealHistory.deleteMany();
    await prisma.menuItemTag.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.mealGroupMember.deleteMany();
    await prisma.user.deleteMany();
    await prisma.mealGroup.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication to list active menu items', async () => {
    await request(app.getHttpServer()).get('/menu-items').expect(401);
  });

  it('lists only menu items in the current meal group', async () => {
    const firstToken = await createEditorToken(app, prisma, 'first-editor-openid');
    const secondToken = await createEditorToken(app, prisma, 'second-editor-openid');

    await request(app.getHttpServer())
      .post('/menu-items')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({
        title: '第一位用户的菜',
        type: 'recipe',
        mealPeriods: ['dinner'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/menu-items')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({
        title: '第二位用户的菜',
        type: 'recipe',
        mealPeriods: ['lunch'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/menu-items')
      .set('Authorization', `Bearer ${firstToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.map((item: { title: string }) => item.title)).toEqual([
          '第一位用户的菜',
        ]);
      });
  });

  it('accepts local upload URLs as menu item cover images', async () => {
    const token = await createEditorToken(app, prisma, 'local-cover-editor-openid');

    await request(app.getHttpServer())
      .post('/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '本地封面菜谱',
        type: 'recipe',
        mealPeriods: ['dinner'],
        coverImageUrl: 'http://localhost:3000/uploads/2026/04/local-cover.jpg',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.coverImageUrl).toBe(
          'http://localhost:3000/uploads/2026/04/local-cover.jpg',
        );
      });
  });

  it('lets invited meal group members read and edit shared menu items', async () => {
    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'shared-owner-openid' })
      .expect(201);
    const ownerToken = ownerLogin.body.data.token as string;
    const ownerGroupId = ownerLogin.body.data.currentGroupId as string;

    const invite = await request(app.getHttpServer())
      .post(`/groups/${ownerGroupId}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'shared-member-openid' })
      .expect(201);
    const memberToken = memberLogin.body.data.token as string;

    await request(app.getHttpServer())
      .post('/groups/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode: invite.body.data.inviteCode })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/menu-items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: '饭团共享菜',
        type: 'recipe',
        mealPeriods: ['dinner'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/menu-items')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.map((item: { title: string }) => item.title)).toEqual([
          '饭团共享菜',
        ]);
      });

    await request(app.getHttpServer())
      .post(`/menu-items/${created.body.data.id}/favorite`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.isFavorite).toBe(true);
      });
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

  it('hides archived menu item details from its owner', async () => {
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
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('prevents users from reading or mutating another user menu item', async () => {
    const firstToken = await createEditorToken(app, prisma, 'owner-editor-openid');
    const secondToken = await createEditorToken(app, prisma, 'other-editor-openid');
    const created = await request(app.getHttpServer())
      .post('/menu-items')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({
        title: '只属于第一个用户',
        type: 'recipe',
        mealPeriods: ['dinner'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/menu-items/${created.body.data.id}`)
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/menu-items/${created.body.data.id}/favorite`)
      .set('Authorization', `Bearer ${secondToken}`)
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

  it('records meal history and returns recent history in the current group', async () => {
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
      .set('Authorization', `Bearer ${token}`)
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
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.map((tag: { name: string }) => tag.name)).toContain(
          '暖胃',
        );
      });
  });
});
