import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { PromotionsService } from './promotions.service.js';

@Roles(UserRole.ADMIN)
@Controller('admin/promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  list() {
    return this.promotions.list();
  }

  @Post()
  create(@Body() body: CreatePromotionDto) {
    return this.promotions.create(body);
  }

  @Patch(':id/active/:active')
  setActive(
    @Param('id') id: string,
    @Param('active', ParseBoolPipe) active: boolean,
  ) {
    return this.promotions.setActive(id, active);
  }
}
