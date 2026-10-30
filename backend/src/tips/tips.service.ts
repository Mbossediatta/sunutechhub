import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseCourseStorageService } from '../courses/supabase-course-storage.service.js';
import type { CreateTipCommentDto } from './dto/create-tip-comment.dto.js';
import type { CreateTipDto } from './dto/create-tip.dto.js';
import type { UpdateTipDto } from './dto/update-tip.dto.js';

const TIP_NARRATION_PATH =
  /^storage:\/\/tips\/[A-Za-z0-9-]+-[A-Za-z0-9._-]+\.(mp3|mp4)$/i;

@Injectable()
export class TipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseCourseStorageService,
  ) {}

  listPublished() {
    return this.prisma.tip.findMany({
      where: { published: true },
      select: {
        slug: true,
        title: true,
        description: true,
        htmlContent: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublished(slug: string) {
    const tip = await this.prisma.tip.findFirst({
      where: { slug, published: true },
      select: {
        slug: true,
        title: true,
        description: true,
        htmlContent: true,
        narrationPath: true,
        createdAt: true,
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
          take: 200,
        },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!tip) throw new NotFoundException('Astuce introuvable.');
    const narrationUrl = tip.narrationPath
      ? await this.storage.createSignedDownloadUrl(tip.narrationPath)
      : null;
    return {
      ...tip,
      narrationUrl,
      narrationFormat: tip.narrationPath
        ? tip.narrationPath.toLowerCase().endsWith('.mp3')
          ? 'mp3'
          : 'mp4'
        : null,
    };
  }

  async hasLiked(userId: string, slug: string) {
    const tip = await this.findPublishedTip(slug);
    const like = await this.prisma.tipLike.findUnique({
      where: { userId_tipId: { userId, tipId: tip.id } },
      select: { tipId: true },
    });
    return { liked: Boolean(like) };
  }

  async setLike(userId: string, slug: string, liked: boolean) {
    const tip = await this.findPublishedTip(slug);
    if (liked) {
      await this.prisma.tipLike.createMany({
        data: [{ userId, tipId: tip.id }],
        skipDuplicates: true,
      });
    } else {
      await this.prisma.tipLike.deleteMany({
        where: { userId, tipId: tip.id },
      });
    }

    const [count, like] = await Promise.all([
      this.prisma.tipLike.count({ where: { tipId: tip.id } }),
      this.prisma.tipLike.findUnique({
        where: { userId_tipId: { userId, tipId: tip.id } },
        select: { tipId: true },
      }),
    ]);
    return { liked: Boolean(like), count };
  }

  async createComment(
    userId: string,
    slug: string,
    input: CreateTipCommentDto,
  ) {
    const tip = await this.findPublishedTip(slug);
    return this.prisma.tipComment.create({
      data: { tipId: tip.id, userId, body: input.body.trim() },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  listAdmin() {
    return this.prisma.tip.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        htmlContent: true,
        narrationPath: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(input: CreateTipDto) {
    if (input.narrationPath) this.requireNarrationPath(input.narrationPath);
    const slugBase = this.slugify(input.title) || 'astuce';
    const slug = `${slugBase}-${randomUUID().slice(0, 8)}`;
    return this.prisma.tip.create({
      data: {
        slug,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        htmlContent: input.htmlContent,
        narrationPath: input.narrationPath || null,
        published: input.published ?? false,
      },
    });
  }

  async update(id: string, input: UpdateTipDto) {
    const current = await this.prisma.tip.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Astuce introuvable.');
    if (input.narrationPath) this.requireNarrationPath(input.narrationPath);
    const title = input.title?.trim();
    return this.prisma.tip.update({
      where: { id },
      data: {
        title,
        slug:
          title && title !== current.title
            ? `${this.slugify(title) || 'astuce'}-${randomUUID().slice(0, 8)}`
            : undefined,
        description: input.description?.trim(),
        htmlContent: input.htmlContent,
        narrationPath:
          input.narrationPath === undefined
            ? undefined
            : input.narrationPath || null,
        published: input.published,
      },
    });
  }

  async delete(id: string) {
    const tip = await this.prisma.tip.findUnique({ where: { id } });
    if (!tip) throw new NotFoundException('Astuce introuvable.');
    await this.prisma.tip.delete({ where: { id } });
    if (tip.narrationPath) {
      await this.storage.deleteTipNarration(tip.narrationPath);
    }
    return { success: true };
  }

  private requireNarrationPath(path: string) {
    if (!TIP_NARRATION_PATH.test(path)) {
      throw new BadRequestException(
        'La narration doit provenir d’un téléversement MP3 ou MP4 validé.',
      );
    }
  }

  private async findPublishedTip(slug: string) {
    const tip = await this.prisma.tip.findFirst({
      where: { slug, published: true },
      select: { id: true },
    });
    if (!tip) throw new NotFoundException('Astuce introuvable.');
    return tip;
  }

  private slugify(value: string) {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }
}
