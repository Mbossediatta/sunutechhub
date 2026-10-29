import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { DeleteCoursePdfUploadDto } from './dto/delete-course-pdf-upload.dto.js';
import { VerifyCoursePdfUploadDto } from './dto/verify-course-pdf-upload.dto.js';
import { SupabaseCourseStorageService } from './supabase-course-storage.service.js';

describe('SupabaseCourseStorageService', () => {
  const config = {
    get: vi.fn((name: string, fallback?: string) => {
      const values: Record<string, string> = {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        SUPABASE_COURSE_FILES_BUCKET: 'course-files',
        SUPABASE_COURSE_BANNERS_BUCKET: 'course-banners',
      };
      return values[name] ?? fallback;
    }),
  };
  let storage: SupabaseCourseStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new SupabaseCourseStorageService(
      config as unknown as ConfigService,
    );
  });

  describe('course PDF upload DTOs', () => {
    it('accepts a non-empty object path and valid size during verification', async () => {
      const dto = Object.assign(new VerifyCoursePdfUploadDto(), {
        path: 'courses/course-1/file.pdf',
        size: 303310,
      });

      await expect(validate(dto)).resolves.toEqual([]);
    });

    it('accepts a non-empty object path for PDF cleanup', async () => {
      const dto = Object.assign(new DeleteCoursePdfUploadDto(), {
        path: 'courses/course-1/file.pdf',
      });

      await expect(validate(dto)).resolves.toEqual([]);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses oversized or non-PDF upload requests before contacting storage', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      storage.createSignedUpload(
        'course-1',
        'support.pdf',
        21 * 1024 * 1024,
        'application/pdf',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      storage.createSignedUpload('course-1', 'support.pdf', 100, 'text/plain'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates a course-scoped signed upload token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: '/object/upload/sign/course-files/courses/course-1/support.pdf?token=signed-upload-token',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await storage.createSignedUpload(
      'course-1',
      'support de cours.pdf',
      1024,
      'application/pdf',
    );

    expect(result.path).toMatch(
      /^courses\/course-1\/[0-9a-f-]+-support_de_cours\.pdf$/i,
    );
    expect(result).toEqual({
      path: expect.stringMatching(
        /^courses\/course-1\/[0-9a-f-]+-support_de_cours\.pdf$/i,
      ),
      signedUrl:
        'https://project.supabase.co/storage/v1/object/upload/sign/course-files/courses/course-1/support.pdf?token=signed-upload-token',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/storage/v1/object/upload/sign/course-files/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer service-role-key',
        }),
      }),
    );
  });

  it('creates signed uploads for project screenshots in the public image bucket', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: '/object/upload/sign/course-banners/project-images/capture.png?token=upload-token',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await storage.createSignedShowcaseImageUpload(
      'capture.png',
      120_000,
      'image/png',
    );

    expect(result.path).toMatch(/^project-images\/[0-9a-f-]+-capture\.png$/i);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/storage/v1/object/upload/sign/course-banners/project-images/',
      ),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejects invalid or oversized project screenshots before contacting storage', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      storage.createSignedShowcaseImageUpload(
        'capture.svg',
        500,
        'image/svg+xml',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      storage.createSignedShowcaseImageUpload(
        'capture.png',
        3 * 1024 * 1024,
        'image/png',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['audio.mp3', 'audio/mpeg', '.mp3'],
    ['video.mp4', 'video/mp4', '.mp4'],
  ])(
    'creates signed narration uploads for %s',
    async (filename, contentType, extension) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            url: '/object/upload/sign/course-files/tips/audio.mp3?token=signed-upload-token',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await storage.createSignedTipNarrationUpload(
        filename,
        1024,
        contentType,
      );

      expect(result.path).toMatch(/^tips\/[0-9a-f-]+-/i);
      expect(result.path.toLowerCase().endsWith(extension)).toBe(true);
      expect(result.contentType).toBe(contentType);
    },
  );

  it.each([
    [
      'audio.mp3',
      'audio/mpeg',
      new Uint8Array([0x49, 0x44, 0x33]),
      'bytes 0-2/1024',
    ],
    [
      'video.mp4',
      'video/mp4',
      new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
      ]),
      'bytes 0-11/1024',
    ],
  ])(
    'verifies a valid narration signature for %s',
    async (filename, contentType, signature, contentRange) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(signature, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Range': contentRange,
          },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const path = `tips/123e4567-e89b-12d3-a456-426614174000-${filename}`;
      await expect(
        storage.verifyUploadedTipNarration(path, 1024, contentType),
      ).resolves.toBe(`storage://${path}`);
    },
  );

  it('creates a signed upload for a banner image in the dedicated bucket', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: '/object/upload/sign/course-banners/course-banners/banner.png?token=signed-upload-token',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await storage.createSignedBannerUpload(
      'bannière.png',
      1024,
      'image/png',
    );

    expect(result.path).toMatch(/^course-banners\/[0-9a-f-]+-banniere\.png$/i);
    expect(result.contentType).toBe('image/png');
    expect(result.signedUrl).toContain(
      '/storage/v1/object/upload/sign/course-banners/course-banners/',
    );
  });

  it('rejects unsupported or oversized banner uploads before contacting storage', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      storage.createSignedBannerUpload('banner.gif', 1024, 'image/gif'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      storage.createSignedBannerUpload(
        'banner.png',
        6 * 1024 * 1024,
        'image/png',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies PNG signature, content type, size, and returns its public URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
        ]),
        {
          status: 206,
          headers: {
            'Content-Type': 'image/png',
            'Content-Range': 'bytes 0-11/1024',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      storage.verifyUploadedBanner(
        'course-banners/123e4567-e89b-12d3-a456-426614174000-banner.png',
        1024,
        'image/png',
      ),
    ).resolves.toBe(
      'https://project.supabase.co/storage/v1/object/public/course-banners/course-banners/123e4567-e89b-12d3-a456-426614174000-banner.png',
    );
  });

  it('rejects unsafe banner paths when deleting temporary uploads', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      storage.deleteCourseBanner('courses/other-course/file.png'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an uploaded banner with an invalid file signature', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array(12), {
        status: 206,
        headers: {
          'Content-Type': 'image/png',
          'Content-Range': 'bytes 0-11/1024',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      storage.verifyUploadedBanner(
        'course-banners/123e4567-e89b-12d3-a456-426614174000-banner.png',
        1024,
        'image/png',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verifies PDF signature, size, and generates a private signed download URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), {
          status: 206,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Range': 'bytes 0-4/1024',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            signedURL:
              '/object/sign/course-files/courses/course-1/123e4567-e89b-12d3-a456-426614174000-support.pdf?token=x',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const path =
      'courses/course-1/123e4567-e89b-12d3-a456-426614174000-support.pdf';

    await expect(
      storage.verifyUploadedPdf('course-1', path, 1024),
    ).resolves.toBe(`storage://${path}`);
    await expect(
      storage.createSignedDownloadUrl(`storage://${path}`),
    ).resolves.toBe(
      `https://project.supabase.co/storage/v1/object/sign/course-files/${path}?token=x`,
    );
  });

  it('only deletes PDFs stored under the requested course path', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const path =
      'courses/course-1/123e4567-e89b-12d3-a456-426614174000-support.pdf';

    await expect(storage.deleteCoursePdf('course-1', path)).resolves.toEqual({
      deleted: true,
    });
    await expect(
      storage.deleteCoursePdf('course-2', path),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
