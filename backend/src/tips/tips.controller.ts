import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { SupabaseCourseStorageService } from '../courses/supabase-course-storage.service.js';
import { CreateTipDto } from './dto/create-tip.dto.js';
import { DeleteTipNarrationDto } from './dto/delete-tip-narration.dto.js';
import { TipNarrationUploadDto } from './dto/tip-narration-upload.dto.js';
import { UpdateTipDto } from './dto/update-tip.dto.js';
import { VerifyTipNarrationUploadDto } from './dto/verify-tip-narration-upload.dto.js';
import { TipsService } from './tips.service.js';

@Public()
@Controller('tips')
export class TipsController {
  constructor(private readonly tips: TipsService) {}

  @Get()
  list() {
    return this.tips.listPublished();
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.tips.getPublished(slug);
  }
}

@Roles(UserRole.ADMIN)
@Controller('admin/tips')
export class AdminTipsController {
  constructor(
    private readonly tips: TipsService,
    private readonly storage: SupabaseCourseStorageService,
  ) {}

  @Get()
  list() {
    return this.tips.listAdmin();
  }

  @Post('narration/upload-url')
  createNarrationUploadUrl(@Body() body: TipNarrationUploadDto) {
    return this.storage.createSignedTipNarrationUpload(
      body.filename,
      body.size,
      body.contentType,
    );
  }

  @Post('narration/verify-upload')
  verifyNarrationUpload(@Body() body: VerifyTipNarrationUploadDto) {
    return this.storage
      .verifyUploadedTipNarration(body.path, body.size, body.contentType)
      .then((path) => ({ path }));
  }

  @Delete('narration')
  deleteTemporaryNarration(@Body() body: DeleteTipNarrationDto) {
    return this.storage.deleteTipNarration(body.path);
  }

  @Post()
  create(@Body() body: CreateTipDto) {
    return this.tips.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTipDto) {
    return this.tips.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tips.delete(id);
  }
}
