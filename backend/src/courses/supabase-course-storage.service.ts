import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

const MAX_PDF_SIZE = 20 * 1024 * 1024;
const MAX_BANNER_SIZE = 5 * 1024 * 1024;
const MAX_PROJECT_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_TIP_NARRATION_SIZE = 50 * 1024 * 1024;
const STORAGE_PREFIX = 'storage://';

@Injectable()
export class SupabaseCourseStorageService {
  constructor(private readonly config: ConfigService) {}

  async createSignedUpload(
    courseId: string,
    filename: string,
    size: number,
    contentType: string,
  ) {
    if (size < 5 || size > MAX_PDF_SIZE || contentType !== 'application/pdf') {
      throw new BadRequestException(
        'Choisis un fichier PDF valide de 20 Mo maximum.',
      );
    }

    const safeName = filename
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(-120);
    if (!safeName.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Le fichier doit avoir l’extension .pdf.');
    }

    const path = `courses/${courseId}/${randomUUID()}-${safeName}`;
    const { baseUrl, bucket, serviceKey } = this.storageConfig();
    return this.createSignedUploadForPath(baseUrl, bucket, serviceKey, path);
  }

  async createSignedBannerUpload(
    filename: string,
    size: number,
    contentType: string,
  ) {
    return this.createSignedCourseBannerUpload(
      'course-banners',
      filename,
      size,
      contentType,
    );
  }

  async createSignedTrainerBannerUpload(
    instructorId: string,
    filename: string,
    size: number,
    contentType: string,
  ) {
    if (!/^[A-Za-z0-9_-]+$/.test(instructorId)) {
      throw new BadRequestException('Le compte formateur est invalide.');
    }
    return this.createSignedCourseBannerUpload(
      `course-banners/trainers/${instructorId}`,
      filename,
      size,
      contentType,
    );
  }

  private async createSignedCourseBannerUpload(
    pathPrefix: string,
    filename: string,
    size: number,
    contentType: string,
  ) {
    const extensionByType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = extensionByType[contentType];
    if (!extension || size < 13 || size > MAX_BANNER_SIZE) {
      throw new BadRequestException(
        'Choisis une image JPG, PNG ou WebP de 5 Mo maximum.',
      );
    }

    const safeName = filename
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(-120)
      .replace(/\.[^.]*$/, '');
    const path = `${pathPrefix}/${randomUUID()}-${safeName || 'banner'}${extension}`;
    const { baseUrl, serviceKey } = this.storageConfig();
    const bucket = this.config.get<string>(
      'SUPABASE_COURSE_BANNERS_BUCKET',
      'course-banners',
    );
    if (!bucket) {
      throw new ServiceUnavailableException(
        'Le stockage des bannières de cours n’est pas configuré.',
      );
    }
    const upload = await this.createSignedUploadForPath(
      baseUrl,
      bucket,
      serviceKey,
      path,
    );
    return { ...upload, contentType };
  }

  async createSignedShowcaseImageUpload(
    filename: string,
    size: number,
    contentType: string,
  ) {
    const extensionByType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = extensionByType[contentType];
    if (
      !extension ||
      !filename.toLowerCase().endsWith(extension) ||
      !Number.isSafeInteger(size) ||
      size < 13 ||
      size > MAX_PROJECT_IMAGE_SIZE
    ) {
      throw new BadRequestException(
        'Choisis une image JPG, PNG ou WebP de 2 Mo maximum.',
      );
    }

    const safeName = filename
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(-120)
      .replace(/\.[^.]*$/, '');
    const path = `project-images/${randomUUID()}-${safeName || 'capture'}${extension}`;
    const { baseUrl, serviceKey } = this.storageConfig();
    const bucket = this.projectImageBucket();
    return {
      ...(await this.createSignedUploadForPath(
        baseUrl,
        bucket,
        serviceKey,
        path,
      )),
      contentType,
    };
  }

  async verifyUploadedShowcaseImage(
    path: string,
    expectedSize: number,
    contentType: string,
  ) {
    const extensionByType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = extensionByType[contentType];
    const objectPath = this.requireShowcaseImagePath(path);
    if (
      !extension ||
      !objectPath.toLowerCase().endsWith(extension) ||
      !Number.isSafeInteger(expectedSize) ||
      expectedSize < 13 ||
      expectedSize > MAX_PROJECT_IMAGE_SIZE
    ) {
      throw new BadRequestException(
        'La capture doit être une image JPG, PNG ou WebP de 2 Mo maximum.',
      );
    }

    const { baseUrl, serviceKey } = this.storageConfig();
    const bucket = this.projectImageBucket();
    const response = await fetch(
      `${baseUrl}/storage/v1/object/${this.encodePath(bucket)}/${this.encodePath(objectPath)}`,
      {
        headers: this.headers(serviceKey, { Range: 'bytes=0-11' }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null);
    if (!response?.ok) {
      throw new BadGatewayException(
        'Impossible de vérifier la capture téléversée dans Supabase Storage.',
      );
    }

    const signature = new Uint8Array(await response.arrayBuffer());
    const contentRange = response.headers.get('content-range');
    const totalSize = contentRange?.match(/\/(\d+)$/)?.[1];
    const validSignature =
      contentType === 'image/jpeg'
        ? signature[0] === 0xff &&
          signature[1] === 0xd8 &&
          signature[2] === 0xff
        : contentType === 'image/png'
          ? [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
              (byte, index) => signature[index] === byte,
            )
          : signature[0] === 0x52 &&
            signature[1] === 0x49 &&
            signature[2] === 0x46 &&
            signature[3] === 0x46 &&
            signature[8] === 0x57 &&
            signature[9] === 0x45 &&
            signature[10] === 0x42 &&
            signature[11] === 0x50;
    if (
      !validSignature ||
      response.headers.get('content-type')?.split(';')[0] !== contentType ||
      !totalSize ||
      Number(totalSize) !== expectedSize
    ) {
      throw new BadRequestException(
        'Le fichier envoyé n’est pas une image valide ou sa taille a changé.',
      );
    }
    return `${STORAGE_PREFIX}${objectPath}`;
  }

  getPublicShowcaseImageUrl(path: string) {
    const objectPath = this.requireShowcaseImagePath(path);
    const { baseUrl } = this.storageConfig();
    return new URL(
      `/storage/v1/object/public/${this.encodePath(this.projectImageBucket())}/${this.encodePath(objectPath)}`,
      baseUrl,
    ).toString();
  }

  async createSignedTipNarrationUpload(
    filename: string,
    size: number,
    contentType: string,
  ) {
    const extensionByType: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'video/mp4': '.mp4',
    };
    const extension = extensionByType[contentType];
    if (
      !extension ||
      !filename.toLowerCase().endsWith(extension) ||
      !Number.isSafeInteger(size) ||
      size < (contentType === 'audio/mpeg' ? 3 : 12) ||
      size > MAX_TIP_NARRATION_SIZE
    ) {
      throw new BadRequestException(
        'Choisis un fichier audio MP3 ou vidéo MP4 de 50 Mo maximum.',
      );
    }

    const safeName = filename
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(-120);
    if (!safeName.toLowerCase().endsWith(extension)) {
      throw new BadRequestException(
        `Le fichier doit avoir l’extension ${extension}.`,
      );
    }

    const path = `tips/${randomUUID()}-${safeName}`;
    const { baseUrl, bucket, serviceKey } = this.storageConfig();
    return {
      ...(await this.createSignedUploadForPath(
        baseUrl,
        bucket,
        serviceKey,
        path,
      )),
      contentType,
    };
  }

  async verifyUploadedTipNarration(
    path: string,
    expectedSize: number,
    contentType: string,
  ) {
    const objectPath = this.requireTipPath(path);
    if (
      !Number.isSafeInteger(expectedSize) ||
      expectedSize < (contentType === 'audio/mpeg' ? 3 : 12) ||
      expectedSize > MAX_TIP_NARRATION_SIZE ||
      !(
        (contentType === 'video/mp4' &&
          objectPath.toLowerCase().endsWith('.mp4')) ||
        (contentType === 'audio/mpeg' &&
          objectPath.toLowerCase().endsWith('.mp3'))
      )
    ) {
      throw new BadRequestException(
        'La narration doit être un fichier MP3 ou MP4 de 50 Mo maximum.',
      );
    }

    const { baseUrl, bucket, serviceKey } = this.storageConfig();
    const response = await fetch(
      `${baseUrl}/storage/v1/object/${this.encodePath(bucket)}/${this.encodePath(objectPath)}`,
      {
        headers: this.headers(serviceKey, {
          Range: `bytes=0-${contentType === 'audio/mpeg' ? 2 : 11}`,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null);
    if (!response?.ok) {
      throw new BadGatewayException(
        'Impossible de vérifier la narration téléversée dans Supabase Storage.',
      );
    }

    const signature = new Uint8Array(await response.arrayBuffer());
    const contentRange = response.headers.get('content-range');
    const totalSize = contentRange?.match(/\/(\d+)$/)?.[1];
    const isMp4 =
      contentType === 'video/mp4' &&
      signature.length >= 12 &&
      signature[4] === 0x66 &&
      signature[5] === 0x74 &&
      signature[6] === 0x79 &&
      signature[7] === 0x70;
    const isMp3 =
      contentType === 'audio/mpeg' &&
      ((signature[0] === 0x49 &&
        signature[1] === 0x44 &&
        signature[2] === 0x33) ||
        (signature[0] === 0xff && (signature[1] & 0xe0) === 0xe0));
    if (
      (!isMp4 && !isMp3) ||
      response.headers.get('content-type')?.split(';')[0] !== contentType ||
      !totalSize ||
      Number(totalSize) !== expectedSize
    ) {
      throw new BadRequestException(
        'Le fichier envoyé n’est pas un MP3 ou MP4 valide, ou sa taille a changé.',
      );
    }
    return `${STORAGE_PREFIX}${objectPath}`;
  }

  async deleteTipNarration(path: string) {
    const objectPath = this.requireTipPath(path);
    const { baseUrl, bucket, serviceKey } = this.storageConfig();
    const response = await fetch(
      `${baseUrl}/storage/v1/object/${this.encodePath(bucket)}`,
      {
        method: 'DELETE',
        headers: this.headers(serviceKey, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ prefixes: [objectPath] }),
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null);
    if (!response?.ok) {
      throw new BadGatewayException(
        'Impossible de supprimer la narration de Supabase Storage.',
      );
    }
    return { deleted: true };
  }

  private async createSignedUploadForPath(
    baseUrl: string,
    bucket: string,
    serviceKey: string,
    path: string,
  ) {
    const response = await fetch(
      `${baseUrl}/storage/v1/object/upload/sign/${this.encodePath(bucket)}/${this.encodePath(path)}`,
      {
        method: 'POST',
        headers: this.headers(serviceKey, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null);

    if (!response?.ok) {
      throw new BadGatewayException(
        'Supabase Storage n’a pas pu préparer le téléversement du fichier.',
      );
    }
    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== 'object') {
      throw new BadGatewayException(
        'Supabase Storage a renvoyé une réponse de téléversement invalide.',
      );
    }
    let token: string | null = null;
    let signedUrl: string | null = null;
    if ('token' in result && typeof result.token === 'string') {
      token = result.token;
    }
    if ('url' in result && typeof result.url === 'string') {
      try {
        const signedUploadUrl = /^https?:\/\//i.test(result.url)
          ? new URL(result.url)
          : new URL(`${baseUrl}/storage/v1/${result.url.replace(/^\/+/, '')}`);
        const parsedUrl = signedUploadUrl;
        token ??= parsedUrl.searchParams.get('token');
        if (parsedUrl.origin === new URL(baseUrl).origin) {
          signedUrl = parsedUrl.toString();
        }
      } catch {
        signedUrl = null;
      }
    }

    if (!token || !signedUrl) {
      throw new BadGatewayException(
        'Supabase Storage n’a pas renvoyé de lien de téléversement valide.',
      );
    }

    return { path, signedUrl };
  }

  async verifyUploadedBanner(
    path: string,
    expectedSize: number,
    contentType: string,
  ) {
    const extensionByType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    if (
      !extensionByType[contentType] ||
      !Number.isSafeInteger(expectedSize) ||
      expectedSize < 13 ||
      expectedSize > MAX_BANNER_SIZE
    ) {
      throw new BadRequestException(
        'La bannière doit être une image JPG, PNG ou WebP de 5 Mo maximum.',
      );
    }
    const objectPath = this.requireBannerPath(path);
    if (!objectPath.toLowerCase().endsWith(extensionByType[contentType])) {
      throw new BadRequestException(
        'Le format de la bannière ne correspond pas au fichier envoyé.',
      );
    }

    const { baseUrl, serviceKey } = this.storageConfig();
    const bucket = this.config.get<string>(
      'SUPABASE_COURSE_BANNERS_BUCKET',
      'course-banners',
    );
    if (!bucket) {
      throw new ServiceUnavailableException(
        'Le stockage des bannières de cours n’est pas configuré.',
      );
    }
    const response = await fetch(
      `${baseUrl}/storage/v1/object/${this.encodePath(bucket)}/${this.encodePath(objectPath)}`,
      {
        headers: this.headers(serviceKey, { Range: 'bytes=0-11' }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null);
    if (!response?.ok) {
      throw new BadGatewayException(
        'Impossible de vérifier la bannière téléversée dans Supabase Storage.',
      );
    }

    const signature = new Uint8Array(await response.arrayBuffer());
    const contentRange = response.headers.get('content-range');
    const totalSize = contentRange?.match(/\/(\d+)$/)?.[1];
    const validSignature =
      contentType === 'image/jpeg'
        ? signature[0] === 0xff &&
          signature[1] === 0xd8 &&
          signature[2] === 0xff
        : contentType === 'image/png'
          ? [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
              (byte, index) => signature[index] === byte,
            )
          : signature[0] === 0x52 &&
            signature[1] === 0x49 &&
            signature[2] === 0x46 &&
            signature[3] === 0x46 &&
            signature[8] === 0x57 &&
            signature[9] === 0x45 &&
            signature[10] === 0x42 &&
            signature[11] === 0x50;
    if (
      !validSignature ||
      response.headers.get('content-type')?.split(';')[0] !== contentType ||
      !totalSize ||
      Number(totalSize) !== expectedSize
    ) {
      throw new BadRequestException(
        'Le fichier envoyé n’est pas une image valide ou sa taille a changé.',
      );
    }
    return new URL(
      `/storage/v1/object/public/${this.encodePath(bucket)}/${this.encodePath(objectPath)}`,
      baseUrl,
    ).toString();
  }

  async verifyUploadedTrainerBanner(
    instructorId: string,
    path: string,
    expectedSize: number,
    contentType: string,
  ) {
    this.requireTrainerBannerPath(path, instructorId);
    return this.verifyUploadedBanner(path, expectedSize, contentType);
  }

  async deleteCourseBanner(path: string) {
    const objectPath = this.requireBannerPath(path);
    const { baseUrl, serviceKey } = this.storageConfig();
    const bucket = this.config.get<string>(
      'SUPABASE_COURSE_BANNERS_BUCKET',
      'course-banners',
    );
    if (!bucket) {
      throw new ServiceUnavailableException(
        'Le stockage des bannières de cours n’est pas configuré.',
      );
    }
    const response = await fetch(
      `${baseUrl}/storage/v1/object/${this.encodePath(bucket)}`,
      {
        method: 'DELETE',
        headers: this.headers(serviceKey, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ prefixes: [objectPath] }),
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null);
    if (!response?.ok) {
      throw new BadGatewayException(
        'Impossible de supprimer la bannière temporaire de Supabase Storage.',
      );
    }
    return { deleted: true };
  }

  async deleteTrainerCourseBanner(instructorId: string, path: string) {
    this.requireTrainerBannerPath(path, instructorId);
    return this.deleteCourseBanner(path);
  }

  async verifyUploadedPdf(
    courseId: string,
    path: string,
    expectedSize: number,
  ) {
    const objectPath = this.requireCoursePath(courseId, path);
    if (
      !Number.isSafeInteger(expectedSize) ||
      expectedSize < 5 ||
      expectedSize > MAX_PDF_SIZE
    ) {
      throw new BadRequestException(
        'Le fichier PDF doit peser au maximum 20 Mo.',
      );
    }

    const { baseUrl, bucket, serviceKey } = this.storageConfig();
    const response = await fetch(
      `${baseUrl}/storage/v1/object/${this.encodePath(bucket)}/${this.encodePath(objectPath)}`,
      {
        headers: this.headers(serviceKey, { Range: 'bytes=0-4' }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null);

    if (!response || !response.ok) {
      throw new BadGatewayException(
        'Impossible de vérifier le PDF téléversé dans Supabase Storage.',
      );
    }

    const signature = new Uint8Array(await response.arrayBuffer());
    const contentRange = response.headers.get('content-range');
    const totalSize = contentRange?.match(/\/(\d+)$/)?.[1];
    if (
      signature.length < 5 ||
      signature[0] !== 0x25 ||
      signature[1] !== 0x50 ||
      signature[2] !== 0x44 ||
      signature[3] !== 0x46 ||
      signature[4] !== 0x2d ||
      response.headers.get('content-type')?.split(';')[0] !==
        'application/pdf' ||
      !totalSize ||
      Number(totalSize) !== expectedSize
    ) {
      throw new BadRequestException(
        'Le fichier envoyé n’est pas un PDF valide ou sa taille a changé.',
      );
    }

    return `${STORAGE_PREFIX}${objectPath}`;
  }

  async createSignedDownloadUrl(path: string) {
    const objectPath = this.requireStoragePath(path);
    const { baseUrl, bucket, serviceKey } = this.storageConfig();
    const response = await fetch(
      `${baseUrl}/storage/v1/object/sign/${this.encodePath(bucket)}/${this.encodePath(objectPath)}`,
      {
        method: 'POST',
        headers: this.headers(serviceKey, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ expiresIn: 3600 }),
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null);
    if (!response?.ok) {
      throw new BadGatewayException(
        'Impossible de créer un lien temporaire pour le support PDF.',
      );
    }

    const result: unknown = await response.json().catch(() => null);
    if (
      !result ||
      typeof result !== 'object' ||
      !('signedURL' in result) ||
      typeof result.signedURL !== 'string'
    ) {
      throw new BadGatewayException(
        'Supabase Storage a renvoyé un lien de téléchargement invalide.',
      );
    }
    const signedPath = result.signedURL.startsWith('/storage/v1/')
      ? result.signedURL
      : `/storage/v1/${result.signedURL.replace(/^\/+/, '')}`;
    return new URL(signedPath, baseUrl).toString();
  }

  async deleteCoursePdf(courseId: string, path: string) {
    const objectPath = this.requireCoursePath(courseId, path);
    const { baseUrl, bucket, serviceKey } = this.storageConfig();
    const response = await fetch(
      `${baseUrl}/storage/v1/object/${this.encodePath(bucket)}`,
      {
        method: 'DELETE',
        headers: this.headers(serviceKey, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ prefixes: [objectPath] }),
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null);
    if (!response?.ok) {
      throw new BadGatewayException(
        'Impossible de supprimer le PDF temporaire de Supabase Storage.',
      );
    }
    return { deleted: true };
  }

  isStoragePath(value: string) {
    return value.startsWith(STORAGE_PREFIX);
  }

  private requireCoursePath(courseId: string, path: string) {
    const objectPath = this.requireStoragePath(path);
    if (!objectPath.startsWith(`courses/${courseId}/`)) {
      throw new BadRequestException(
        'Le fichier PDF ne correspond pas à ce cours.',
      );
    }
    return objectPath;
  }

  private requireStoragePath(path: string) {
    const objectPath = path.startsWith(STORAGE_PREFIX)
      ? path.slice(STORAGE_PREFIX.length)
      : path;
    const coursePdfPath =
      /^courses\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+-[A-Za-z0-9._-]+\.pdf$/i.test(
        objectPath,
      );
    const tipNarrationPath =
      /^tips\/[A-Za-z0-9-]+-[A-Za-z0-9._-]+\.(mp3|mp4)$/i.test(objectPath);
    if (!coursePdfPath && !tipNarrationPath) {
      throw new BadRequestException(
        'Le chemin du fichier stocké est invalide.',
      );
    }
    return objectPath;
  }

  private requireTipPath(path: string) {
    const objectPath = path.startsWith(STORAGE_PREFIX)
      ? path.slice(STORAGE_PREFIX.length)
      : path;
    if (!/^tips\/[A-Za-z0-9-]+-[A-Za-z0-9._-]+\.(mp3|mp4)$/i.test(objectPath)) {
      throw new BadRequestException(
        'Le chemin de la narration de l’astuce est invalide.',
      );
    }
    return objectPath;
  }

  private requireBannerPath(path: string) {
    const objectPath = path.startsWith('storage://')
      ? path.slice('storage://'.length)
      : path;
    if (
      !/^course-banners\/(?:[A-Za-z0-9-]+-[A-Za-z0-9._-]+|trainers\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+-[A-Za-z0-9._-]+)\.(jpg|png|webp)$/i.test(
        objectPath,
      )
    ) {
      throw new BadRequestException('Le chemin de la bannière est invalide.');
    }
    return objectPath;
  }

  private requireTrainerBannerPath(path: string, instructorId: string) {
    const objectPath = this.requireBannerPath(path);
    if (!/^[A-Za-z0-9_-]+$/.test(instructorId)) {
      throw new BadRequestException('Le compte formateur est invalide.');
    }
    if (!objectPath.startsWith(`course-banners/trainers/${instructorId}/`)) {
      throw new BadRequestException(
        'Cette bannière temporaire ne vous appartient pas.',
      );
    }
    return objectPath;
  }

  private requireShowcaseImagePath(path: string) {
    const objectPath = path.startsWith(STORAGE_PREFIX)
      ? path.slice(STORAGE_PREFIX.length)
      : path;
    if (
      !/^project-images\/[A-Za-z0-9-]+-[A-Za-z0-9._-]+\.(jpg|png|webp)$/i.test(
        objectPath,
      )
    ) {
      throw new BadRequestException('Le chemin de la capture est invalide.');
    }
    return objectPath;
  }

  private projectImageBucket() {
    const bucket = this.config.get<string>(
      'SUPABASE_COURSE_BANNERS_BUCKET',
      'course-banners',
    );
    if (!bucket) {
      throw new ServiceUnavailableException(
        'Le stockage des captures de projets n’est pas configuré.',
      );
    }
    return bucket;
  }

  private storageConfig() {
    const configuredUrl = this.config.get<string>('SUPABASE_URL');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>(
      'SUPABASE_COURSE_FILES_BUCKET',
      'course-files',
    );
    if (!configuredUrl || !serviceKey || !bucket) {
      throw new ServiceUnavailableException(
        'Le stockage des supports PDF n’est pas configuré.',
      );
    }
    let baseUrl: string;
    try {
      const parsed = new URL(configuredUrl);
      const isLocalHttp =
        parsed.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
      if (parsed.protocol !== 'https:' && !isLocalHttp) {
        throw new Error('Unsupported storage URL protocol.');
      }
      baseUrl = parsed.toString().replace(/\/+$/, '');
    } catch {
      throw new ServiceUnavailableException(
        'La configuration Supabase Storage est invalide.',
      );
    }
    return { baseUrl, bucket, serviceKey };
  }

  private headers(serviceKey: string, extra: Record<string, string>) {
    return {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      ...extra,
    };
  }

  private encodePath(path: string) {
    return path.split('/').map(encodeURIComponent).join('/');
  }
}
