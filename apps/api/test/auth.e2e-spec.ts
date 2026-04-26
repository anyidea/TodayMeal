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
    process.env.ENABLE_DEV_LOGIN = 'true';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DEV_LOGIN = 'true';
    process.env.OWNER_OPENIDS = 'owner-openid';
    await prisma.mealGroupInvite.deleteMany();
    await prisma.mealGroupMember.deleteMany();
    await prisma.menuItemTag.deleteMany();
    await prisma.mealHistory.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();
    await prisma.mealGroup.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('binds editor permission with invite code', async () => {
    await prisma.user.create({
      data: { openid: 'user-openid', role: 'viewer' },
    });

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

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.role).toBe('editor');
      });
  });

  it('disables dev login in production unless explicitly enabled', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_DEV_LOGIN;

    await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'user-openid' })
      .expect(403);
  });

  it('disables dev login by default when not explicitly enabled', async () => {
    delete process.env.NODE_ENV;
    delete process.env.ENABLE_DEV_LOGIN;

    await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'user-openid' })
      .expect(403);
  });

  it('allows dev login in test without the explicit flag', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.ENABLE_DEV_LOGIN;

    await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'user-openid' })
      .expect(201);
  });

  it('returns saved profile fields on login', async () => {
    await prisma.user.create({
      data: {
        openid: 'profile-openid',
        nickname: '今天吃饱了',
        avatarUrl: 'https://static.example.test/avatar.jpg',
      },
    });

    await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'profile-openid' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.user).toMatchObject({
          openid: 'profile-openid',
          nickname: '今天吃饱了',
          avatarUrl: 'https://static.example.test/avatar.jpg',
        });
      });
  });

  it('creates a default meal group on login and returns current group state', async () => {
    await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'group-owner-openid' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.user.openid).toBe('group-owner-openid');
        expect(body.data.groups).toHaveLength(1);
        expect(body.data.groups[0]).toMatchObject({
          name: '我的饭团',
          memberCount: 1,
        });
        expect(body.data.currentGroupId).toBe(body.data.groups[0].id);
      });

    await expect(prisma.mealGroup.count()).resolves.toBe(1);
    await expect(prisma.mealGroupMember.count()).resolves.toBe(1);
  });

  it('lets a user join an invited meal group while keeping their own group', async () => {
    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'meal-group-owner-openid' })
      .expect(201);
    const ownerToken = ownerLogin.body.data.token as string;
    const ownerGroupId = ownerLogin.body.data.currentGroupId as string;

    const invite = await request(app.getHttpServer())
      .post(`/groups/${ownerGroupId}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'meal-group-member-openid' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/groups/join')
      .set('Authorization', `Bearer ${memberLogin.body.data.token}`)
      .send({ inviteCode: invite.body.data.inviteCode })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.currentGroupId).toBe(ownerGroupId);
        expect(body.data.groups.map((group: { id: string }) => group.id)).toContain(
          ownerGroupId,
        );
        expect(body.data.groups).toHaveLength(2);
      });
  });

  it('lets the meal group owner remove an invited member', async () => {
    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'remove-owner-openid' })
      .expect(201);
    const ownerToken = ownerLogin.body.data.token as string;
    const ownerUserId = ownerLogin.body.data.user.id as string;
    const ownerGroupId = ownerLogin.body.data.currentGroupId as string;

    const invite = await request(app.getHttpServer())
      .post(`/groups/${ownerGroupId}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'remove-member-openid' })
      .expect(201);
    const memberToken = memberLogin.body.data.token as string;
    const memberUserId = memberLogin.body.data.user.id as string;

    await request(app.getHttpServer())
      .post('/groups/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode: invite.body.data.inviteCode })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/groups/${ownerGroupId}/members/${ownerUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/groups/${ownerGroupId}/members/${ownerUserId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/groups/${ownerGroupId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.memberCount).toBe(1);
      });

    await request(app.getHttpServer())
      .get(`/groups/${ownerGroupId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.map((member: { userId: string }) => member.userId)).toEqual([
          ownerUserId,
        ]);
      });
  });

  it('rejects wrong invite code', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'user-openid' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/bind-invite')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ inviteCode: 'wrong-code' })
      .expect(401);
  });

  it('does not downgrade owner role on later login', async () => {
    const firstLogin = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'owner-openid' })
      .expect(201);

    expect(firstLogin.body.data.user.role).toBe('owner');

    const secondLogin = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'owner-openid' })
      .expect(201);

    expect(secondLogin.body.data.user.role).toBe('owner');
  });

  it('keeps owner role when binding invite code', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/dev-login')
      .send({ openid: 'owner-openid' })
      .expect(201);

    const token = login.body.data.token;

    await request(app.getHttpServer())
      .post('/auth/bind-invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ inviteCode: 'invite-123' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.role).toBe('owner');
      });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.role).toBe('owner');
      });
  });
});
