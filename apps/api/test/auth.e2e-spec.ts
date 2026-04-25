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
    await prisma.user.deleteMany();
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
