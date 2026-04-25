import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MealPeriod, MenuItemType } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Recommendations', () => {
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
    jest.restoreAllMocks();
    await prisma.mealHistory.deleteMany();
    await prisma.menuItemTag.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  async function seedRecommendationCandidates() {
    await prisma.menuItem.create({
      data: {
        title: '番茄牛腩饭',
        type: MenuItemType.recipe,
        mealPeriods: [MealPeriod.dinner],
        isFavorite: true,
        ingredients: [],
        steps: [],
      },
    });

    await prisma.menuItem.create({
      data: {
        title: '昨天吃过的晚餐',
        type: MenuItemType.recipe,
        mealPeriods: [MealPeriod.dinner],
        ingredients: [],
        steps: [],
        mealHistories: {
          create: {
            eatenAt: new Date(Date.now() - 86400000),
          },
        },
      },
    });

    await prisma.menuItem.create({
      data: {
        title: '早餐燕麦',
        type: MenuItemType.recipe,
        mealPeriods: [MealPeriod.breakfast],
        ingredients: [],
        steps: [],
      },
    });
  }

  it('returns a deterministic weighted random dinner recommendation', async () => {
    await seedRecommendationCandidates();
    jest.spyOn(Math, 'random').mockReturnValue(0);

    await request(app.getHttpServer())
      .post('/recommendations/random')
      .send({ mealPeriod: 'dinner' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.item.title).toBe('番茄牛腩饭');
        expect(body.data.reason).toContain('晚餐');
      });
  });

  it('does not include other meal periods in random dinner recommendations', async () => {
    await seedRecommendationCandidates();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    await request(app.getHttpServer())
      .post('/recommendations/random')
      .send({ mealPeriod: 'dinner' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.item.title).toBe('番茄牛腩饭');
        expect(body.data.item.title).not.toBe('早餐燕麦');
      });
  });

  it('returns the highest scored dinner recommendation for today', async () => {
    await seedRecommendationCandidates();

    await request(app.getHttpServer())
      .get('/recommendations/today?mealPeriod=dinner')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.item.title).toBe('番茄牛腩饭');
        expect(body.data.reason).toContain('晚餐');
      });
  });
});
