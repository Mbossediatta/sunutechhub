import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;
  const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('confirms that the database can be queried', async () => {
      await expect(appController.getHealth()).resolves.toEqual({
        status: 'ok',
      });
      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    });
  });
});
