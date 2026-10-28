import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PromotionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePromotionDto } from './dto/create-promotion.dto.js';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(input: CreatePromotionDto) {
    const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
    const expiresAt = new Date(input.expiresAt);
    if (expiresAt <= startsAt) {
      throw new BadRequestException(
        'La date de fin doit être postérieure à la date de début.',
      );
    }
    if (input.type === PromotionType.PERCENTAGE && input.value > 100) {
      throw new BadRequestException(
        'Une réduction en pourcentage ne peut pas dépasser 100 %.',
      );
    }
    try {
      return await this.prisma.promotion.create({
        data: {
          code: input.code.toUpperCase(),
          type: input.type,
          value: input.value,
          startsAt,
          expiresAt,
          usageLimit: input.usageLimit,
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error))
        throw new ConflictException('Ce code promotionnel existe déjà.');
      throw error;
    }
  }

  async setActive(id: string, active: boolean) {
    return this.prisma.promotion.update({ where: { id }, data: { active } });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
