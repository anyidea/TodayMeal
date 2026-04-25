import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MealPeriod, MenuItemType } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Profile', () => {
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
    await prisma.mealHistory.deleteMany();
    await prisma.menuItemTag.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createEditorToken(openid = 'profile-editor-openid') {
    await prisma.user.create({
      data: { openid, role: 'viewer' },
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

    return {
      token,
      userId: login.body.data.user.id as string,
    };
  }

  it('requires authentication for profile summary', async () => {
    await request(app.getHttpServer()).get('/profile/summary').expect(401);
  });

  it('returns current user menu and history counts', async () => {
    const { token, userId } = await createEditorToken();
    const other = await prisma.user.create({
      data: { openid: 'other-profile-openid', role: 'editor' },
    });

    const recipe = await prisma.menuItem.create({
      data: {
        title: '我的菜谱',
        type: MenuItemType.recipe,
        mealPeriods: [MealPeriod.dinner],
        isFavorite: true,
        ingredients: [],
        steps: [],
        createdById: userId,
        updatedById: userId,
      },
    });
    await prisma.menuItem.create({
      data: {
        title: '我的外卖',
        type: MenuItemType.takeout,
        mealPeriods: [MealPeriod.lunch],
        isFavorite: true,
        ingredients: [],
        steps: [],
        createdById: userId,
        updatedById: userId,
      },
    });
    await prisma.menuItem.create({
      data: {
        title: '别人的菜谱',
        type: MenuItemType.recipe,
        mealPeriods: [MealPeriod.dinner],
        isFavorite: true,
        ingredients: [],
        steps: [],
        createdById: other.id,
        updatedById: other.id,
      },
    });
    await prisma.mealHistory.create({
      data: {
        menuItemId: recipe.id,
        eatenAt: new Date(),
        createdById: userId,
      },
    });

    await request(app.getHttpServer())
      .get('/profile/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual({
          recipeCount: 1,
          takeoutCount: 1,
          favoriteCount: 2,
          recentMealCount: 1,
        });
      });
  });
});
