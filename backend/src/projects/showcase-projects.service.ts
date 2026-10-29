import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseCourseStorageService } from '../courses/supabase-course-storage.service.js';
import type { CreateShowcaseCommentDto } from './dto/create-showcase-comment.dto.js';
import type { CreateShowcaseProjectDto } from './dto/create-showcase-project.dto.js';
import type { ShowcaseImageUploadDto } from './dto/showcase-image-upload.dto.js';
import type { VerifyShowcaseImageUploadDto } from './dto/verify-showcase-image-upload.dto.js';

const SHOWCASE_IMAGE_PATH =
  /^storage:\/\/project-images\/[A-Za-z0-9-]+-[A-Za-z0-9._-]+\.(jpg|png|webp)$/i;

@Injectable()
export class ShowcaseProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseCourseStorageService,
  ) {}

  createImageUploadUrl(input: ShowcaseImageUploadDto) {
    return this.storage.createSignedShowcaseImageUpload(
      input.filename,
      input.size,
      input.contentType,
    );
  }

  async verifyImageUpload(input: VerifyShowcaseImageUploadDto) {
    const path = await this.storage.verifyUploadedShowcaseImage(
      input.path,
      input.size,
      input.contentType,
    );
    return { path };
  }

  async list() {
    const projects = await this.prisma.showcaseProject.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        link: true,
        technologies: true,
        imagePaths: true,
        createdAt: true,
        user: { select: { id: true, name: true, city: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return projects.map((project) => this.withImageUrls(project));
  }

  async get(id: string) {
    const project = await this.prisma.showcaseProject.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, city: true } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
          take: 200,
        },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable.');
    return this.withImageUrls(project);
  }

  async create(userId: string, input: CreateShowcaseProjectDto) {
    const title = input.title.trim();
    const description = input.description.trim();
    if (title.length < 2 || description.length < 10) {
      throw new BadRequestException(
        'Le titre et la description doivent contenir du texte utile.',
      );
    }
    const imagePaths = [...new Set(input.imagePaths ?? [])];
    if (imagePaths.some((path) => !SHOWCASE_IMAGE_PATH.test(path))) {
      throw new BadRequestException(
        'Chaque capture doit provenir d’un téléversement vérifié.',
      );
    }

    const project = await this.prisma.showcaseProject.create({
      data: {
        userId,
        title,
        description,
        link: input.link?.trim() || null,
        technologies: [
          ...new Set(
            input.technologies
              .map((technology) => technology.trim())
              .filter(Boolean),
          ),
        ],
        imagePaths,
      },
      select: {
        id: true,
        title: true,
        description: true,
        link: true,
        technologies: true,
        imagePaths: true,
        createdAt: true,
        user: { select: { id: true, name: true, city: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return this.withImageUrls(project);
  }

  async setLike(userId: string, projectId: string, liked: boolean) {
    const project = await this.prisma.showcaseProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable.');

    if (liked) {
      await this.prisma.showcaseProjectLike.createMany({
        data: [{ userId, projectId }],
        skipDuplicates: true,
      });
    } else {
      await this.prisma.showcaseProjectLike.deleteMany({
        where: { userId, projectId },
      });
    }

    const [count, like] = await Promise.all([
      this.prisma.showcaseProjectLike.count({ where: { projectId } }),
      this.prisma.showcaseProjectLike.findUnique({
        where: { userId_projectId: { userId, projectId } },
        select: { projectId: true },
      }),
    ]);
    return { liked: Boolean(like), count };
  }

  async hasLiked(userId: string, projectId: string) {
    const project = await this.prisma.showcaseProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable.');
    const like = await this.prisma.showcaseProjectLike.findUnique({
      where: { userId_projectId: { userId, projectId } },
      select: { projectId: true },
    });
    return { liked: Boolean(like) };
  }

  async createComment(
    userId: string,
    projectId: string,
    input: CreateShowcaseCommentDto,
  ) {
    const project = await this.prisma.showcaseProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable.');
    return this.prisma.showcaseProjectComment.create({
      data: { projectId, userId, body: input.body.trim() },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  private withImageUrls<T extends { imagePaths: string[] }>(project: T) {
    return {
      ...project,
      imageUrls: project.imagePaths.map((path) =>
        this.storage.getPublicShowcaseImageUrl(path),
      ),
    };
  }
}
