import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttestationStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RevokeAttestationDto } from './dto/revoke-attestation.dto.js';
import type { UpdateVisibilityDto } from './dto/update-visibility.dto.js';

const ATTESTATION_NOTICE =
  'Document délivré par Sunu Tech Hub. Attestation privée, non diplômante, non reconnue par l’État.';

@Injectable()
export class AttestationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  listMine(userId: string) {
    return this.prisma.attestation.findMany({
      where: { userId },
      include: { course: { select: { title: true, instructorName: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  listAdmin() {
    return this.prisma.attestation.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        revokedBy: { select: { name: true } },
      },
      orderBy: { issuedAt: 'desc' },
      take: 500,
    });
  }

  async verify(number: string) {
    const attestation = await this.prisma.attestation.findUnique({
      where: { number },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true, instructorName: true } },
      },
    });
    if (!attestation) {
      return {
        valid: false,
        message:
          'Aucune attestation ne correspond à ce numéro. Vérifie le numéro ou contacte-nous.',
      };
    }

    if (attestation.status === AttestationStatus.REVOKED) {
      return {
        valid: false,
        withdrawn: true,
        message: 'Cette attestation a été retirée.',
      };
    }

    return {
      valid: true,
      message: 'Attestation valide',
      number: attestation.number,
      name: attestation.displayNamePublic ? attestation.user.name : null,
      course: attestation.course.title,
      instructor: attestation.course.instructorName,
      issuedAt: attestation.issuedAt,
      notice: ATTESTATION_NOTICE,
    };
  }

  async issueFreeCourse(userId: string, courseId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const course = await transaction.course.findFirst({
        where: { id: courseId, active: true },
        select: { id: true, isFree: true },
      });
      if (!course) throw new NotFoundException('Cours introuvable.');
      if (!course.isFree) {
        throw new ForbiddenException(
          'Une attestation gratuite est réservée aux cours gratuits.',
        );
      }

      const now = new Date();
      const registration = await transaction.courseRegistration.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { startsAt: true, endsAt: true },
      });
      if (
        !registration ||
        (registration.startsAt !== null && registration.startsAt > now) ||
        (registration.endsAt !== null && registration.endsAt <= now)
      ) {
        throw new ForbiddenException(
          'Inscris-toi à ce cours pour demander ton attestation.',
        );
      }

      const contents = await transaction.courseContent.findMany({
        where: { courseId, published: true },
        select: { id: true },
      });
      if (!contents.length) {
        throw new BadRequestException(
          'Ce cours ne contient pas encore de leçons publiées.',
        );
      }

      const completed = await transaction.lessonProgress.count({
        where: {
          userId,
          courseId,
          contentId: { in: contents.map(({ id }) => id) },
        },
      });
      if (completed !== contents.length) {
        throw new ForbiddenException(
          'Termine tous les contenus du cours avant de télécharger ton attestation.',
        );
      }

      const freeCourseKey = `${userId}:${courseId}`;
      return transaction.attestation.upsert({
        where: { freeCourseKey },
        update: {},
        create: {
          number: `STH-${now.getUTCFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`,
          userId,
          courseId,
          freeCourseKey,
        },
        select: { number: true, issuedAt: true },
      });
    });
  }

  async updateVisibility(
    number: string,
    userId: string,
    input: UpdateVisibilityDto,
  ) {
    const owned = await this.prisma.attestation.findFirst({
      where: { number, userId },
    });
    if (!owned)
      throw new NotFoundException('Attestation de réussite introuvable.');
    return this.prisma.attestation.update({
      where: { id: owned.id },
      data: { displayNamePublic: input.displayNamePublic },
      select: { number: true, displayNamePublic: true },
    });
  }

  async revoke(number: string, adminId: string, input: RevokeAttestationDto) {
    const attestation = await this.prisma.attestation.findUnique({
      where: { number },
      select: { status: true },
    });
    if (!attestation)
      throw new NotFoundException('Attestation de réussite introuvable.');
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.attestation.update({
        where: { number },
        data: {
          status: AttestationStatus.REVOKED,
          revokedAt: new Date(),
          revokedById: adminId,
          revocationReason: input.reason.trim(),
        },
        select: { number: true, status: true, revokedAt: true },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorUserId: adminId,
          action: 'ATTESTATION_REVOKED',
          entity: 'Attestation',
          entityId: number,
          before: { status: attestation.status },
          after: {
            status: updated.status,
            revokedAt: updated.revokedAt?.toISOString() ?? null,
            reason: input.reason.trim(),
          },
        },
      });
      return updated;
    });
  }

  async buildPdf(number: string, userId: string) {
    const attestation = await this.prisma.attestation.findUnique({
      where: { number },
      include: {
        user: { select: { id: true, name: true } },
        course: {
          select: {
            title: true,
            duration: true,
            subjects: true,
            instructorName: true,
          },
        },
        payment: { include: { project: { select: { title: true } } } },
      },
    });
    if (!attestation || attestation.userId !== userId) {
      throw new NotFoundException('Attestation de réussite introuvable.');
    }
    if (attestation.status !== AttestationStatus.ACTIVE) {
      throw new ForbiddenException(
        'Cette attestation a été retirée et ne peut plus être téléchargée.',
      );
    }

    const apiUrl = this.config.get<string>('PAYTECH_PUBLIC_API_URL');
    const publicUrl = this.config.get<string>('FRONTEND_URL');
    if (!apiUrl && !publicUrl) {
      throw new ForbiddenException(
        'Configurez une adresse publique pour générer le QR code de vérification.',
      );
    }
    const verifyUrl = `${(apiUrl ?? publicUrl)!.replace(/\/+$/, '')}/api/attestations/verify/${encodeURIComponent(number)}`;
    const qr = await QRCode.toBuffer(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
    });

    const [signature, logo] = await Promise.all([
      this.loadAttestationSignature(),
      this.loadPlatformLogo(),
    ]);
    const document = await PDFDocument.create();
    const page = document.addPage([842, 595]);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const qrImage = await document.embedPng(qr);
    const navy = rgb(14 / 255, 22 / 255, 48 / 255);
    const cobalt = rgb(43 / 255, 78 / 255, 255 / 255);
    const violet = rgb(124 / 255, 92 / 255, 255 / 255);
    const muted = rgb(93 / 255, 105 / 255, 132 / 255);

    page.drawRectangle({
      x: 22,
      y: 22,
      width: 798,
      height: 551,
      borderColor: cobalt,
      borderWidth: 2,
    });
    page.drawRectangle({
      x: 22,
      y: 22,
      width: 798,
      height: 7,
      color: violet,
    });
    page.drawRectangle({
      x: 38,
      y: 38,
      width: 766,
      height: 519,
      borderColor: rgb(224 / 255, 230 / 255, 244 / 255),
      borderWidth: 1,
    });
    if (logo) {
      const logoImage =
        logo.contentType === 'image/png'
          ? await document.embedPng(logo.bytes)
          : await document.embedJpg(logo.bytes);
      const scale = Math.min(112 / logoImage.width, 58 / logoImage.height);
      page.drawImage(logoImage, {
        x: 52,
        y: 488,
        width: logoImage.width * scale,
        height: logoImage.height * scale,
      });
    } else {
      page.drawText('Sunu Tech Hub', {
        x: 52,
        y: 514,
        font: bold,
        size: 17,
        color: navy,
      });
    }
    page.drawText('FORMATION · APPRENTISSAGE · RÉUSSITE', {
      x: 498,
      y: 524,
      font: bold,
      size: 8,
      color: muted,
    });
    page.drawLine({
      start: { x: 52, y: 474 },
      end: { x: 790, y: 474 },
      thickness: 1,
      color: rgb(224 / 255, 230 / 255, 244 / 255),
    });
    const heading = attestation.paymentId
      ? 'ATTESTATION DE RÉUSSITE'
      : 'ATTESTATION DE FIN DE FORMATION';
    const headingSize = 23;
    page.drawText(heading, {
      x: (842 - bold.widthOfTextAtSize(heading, headingSize)) / 2,
      y: 430,
      font: bold,
      size: headingSize,
      color: cobalt,
    });
    page.drawText('DÉCERNÉE À', {
      x: 52,
      y: 382,
      font: bold,
      size: 9,
      color: violet,
    });
    const memberName = attestation.user.name;
    const nameSize = 27;
    page.drawText(memberName, {
      x: 52,
      y: 344,
      font: bold,
      size: nameSize,
      color: navy,
      maxWidth: 730,
      lineHeight: nameSize + 4,
    });
    page.drawLine({
      start: { x: 52, y: 328 },
      end: { x: 310, y: 328 },
      thickness: 2,
      color: violet,
    });
    page.drawText(
      attestation.paymentId
        ? 'a suivi et réussi le cours'
        : 'a terminé avec succès le cours',
      {
        x: 52,
        y: 301,
        font: regular,
        size: 12,
        color: muted,
      },
    );
    drawWrapped(page, attestation.course.title, 52, 272, 700, bold, 20, navy);
    page.drawRectangle({
      x: 52,
      y: 184,
      width: 738,
      height: 47,
      color: rgb(246 / 255, 248 / 255, 255 / 255),
      borderColor: rgb(230 / 255, 234 / 255, 247 / 255),
      borderWidth: 1,
    });
    page.drawText('COMPÉTENCES / THÈMES ABORDÉS', {
      x: 66,
      y: 211,
      font: bold,
      size: 8,
      color: violet,
    });
    drawWrapped(
      page,
      attestation.course.subjects.slice(0, 6).join(' · ') ||
        attestation.course.title,
      66,
      195,
      700,
      regular,
      9,
      navy,
    );
    if (attestation.payment) {
      page.drawText(
        `Projet rendu : ${attestation.payment.project?.title ?? 'Projet validé'}`,
        {
          x: 52,
          y: 164,
          font: regular,
          size: 9,
          color: navy,
          maxWidth: 620,
        },
      );
    }
    page.drawText(
      `Délivrée le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Africa/Dakar' }).format(attestation.issuedAt)} · Durée du cours : ${attestation.course.duration || 'Non renseignée'}`,
      {
        x: 52,
        y: attestation.payment ? 142 : 160,
        font: regular,
        size: 9,
        color: muted,
        maxWidth: 650,
      },
    );
    page.drawText(`Formateur : ${attestation.course.instructorName}`, {
      x: 52,
      y: attestation.payment ? 119 : 137,
      font: bold,
      size: 9,
      color: navy,
    });
    page.drawText(`Numéro unique : ${attestation.number}`, {
      x: 52,
      y: attestation.payment ? 101 : 119,
      font: regular,
      size: 8,
      color: muted,
    });
    page.drawImage(qrImage, { x: 678, y: 104, width: 88, height: 88 });
    page.drawText('Vérifier cette attestation', {
      x: 675,
      y: 94,
      font: regular,
      size: 7,
      color: cobalt,
    });
    if (signature) {
      const signatureImage =
        signature.contentType === 'image/png'
          ? await document.embedPng(signature.bytes)
          : await document.embedJpg(signature.bytes);
      const scale = Math.min(
        140 / signatureImage.width,
        40 / signatureImage.height,
      );
      page.drawImage(signatureImage, {
        x: 52,
        y: 71,
        width: signatureImage.width * scale,
        height: signatureImage.height * scale,
      });
      page.drawText('Signature de la formatrice', {
        x: 52,
        y: 61,
        font: regular,
        size: 8,
        color: muted,
      });
    }
    drawWrapped(page, ATTESTATION_NOTICE, 52, 47, 580, regular, 7, navy);

    return Buffer.from(await document.save());
  }

  private async loadAttestationSignature() {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: 'attestationSignatureUrl' },
      select: { value: true },
    });
    if (!setting?.value) return null;

    const configuredSupabaseUrl = this.config.get<string>('SUPABASE_URL');
    if (!configuredSupabaseUrl) {
      throw new ServiceUnavailableException(
        'Le stockage de la signature des attestations n’est pas configuré.',
      );
    }

    const bucket = this.config.get<string>(
      'SUPABASE_COURSE_BANNERS_BUCKET',
      'course-banners',
    );
    let signatureUrl: URL;
    let supabaseUrl: URL;
    try {
      signatureUrl = new URL(setting.value);
      supabaseUrl = new URL(configuredSupabaseUrl);
    } catch {
      throw new BadGatewayException(
        'L’adresse de la signature des attestations est invalide.',
      );
    }
    const publicPath = `/storage/v1/object/public/${bucket}/course-banners/`;
    if (
      signatureUrl.protocol !== 'https:' ||
      signatureUrl.origin !== supabaseUrl.origin ||
      !signatureUrl.pathname.startsWith(publicPath)
    ) {
      throw new BadGatewayException(
        'La signature doit provenir du stockage configuré pour les bannières de cours.',
      );
    }

    let response: Response;
    try {
      response = await fetch(signatureUrl, {
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Impossible de charger la signature depuis le stockage.',
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(
        'Le stockage n’a pas pu fournir la signature de l’attestation.',
      );
    }

    const contentType = response.headers.get('content-type')?.split(';')[0];
    const declaredSize = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredSize) && declaredSize > 1_000_000) {
      throw new BadGatewayException(
        'Le fichier de signature dépasse la taille maximale autorisée.',
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 1_000_000) {
      throw new BadGatewayException(
        'Le fichier de signature dépasse la taille maximale autorisée.',
      );
    }
    const validPng =
      contentType === 'image/png' &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (byte, index) => bytes[index] === byte,
      );
    const validJpeg =
      contentType === 'image/jpeg' &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    if (!validPng && !validJpeg) {
      throw new BadGatewayException(
        'La signature doit être une image PNG ou JPEG valide.',
      );
    }
    return { bytes, contentType };
  }

  private async loadPlatformLogo() {
    const [setting, frontendUrl] = await Promise.all([
      this.prisma.platformSetting.findUnique({
        where: { key: 'logoUrl' },
        select: { value: true },
      }),
      Promise.resolve(this.config.get<string>('FRONTEND_URL')),
    ]);
    if (!frontendUrl) return null;

    let frontendOrigin: string;
    try {
      frontendOrigin = new URL(frontendUrl).origin;
    } catch {
      throw new ServiceUnavailableException(
        'L’adresse publique du site est invalide pour intégrer le logo.',
      );
    }

    let logoUrl: URL;
    try {
      logoUrl = new URL(setting?.value || '/logo-sunutech.png', frontendUrl);
    } catch {
      logoUrl = new URL('/logo-sunutech.png', frontendUrl);
    }
    if (
      logoUrl.origin !== frontendOrigin ||
      (logoUrl.protocol !== 'https:' &&
        !(
          logoUrl.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(logoUrl.hostname)
        ))
    ) {
      logoUrl = new URL('/logo-sunutech.png', frontendUrl);
    }

    let response: Response;
    try {
      response = await fetch(logoUrl, {
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Impossible de charger le logo de la plateforme.',
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(
        'Le site n’a pas pu fournir le logo pour l’attestation.',
      );
    }
    const contentType = response.headers.get('content-type')?.split(';')[0];
    const declaredSize = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredSize) && declaredSize > 1_000_000) {
      throw new BadGatewayException(
        'Le logo de la plateforme dépasse la taille maximale autorisée.',
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 1_000_000) {
      throw new BadGatewayException(
        'Le logo de la plateforme dépasse la taille maximale autorisée.',
      );
    }
    const validPng =
      contentType === 'image/png' &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (byte, index) => bytes[index] === byte,
      );
    const validJpeg =
      contentType === 'image/jpeg' &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    if (!validPng && !validJpeg) {
      throw new BadGatewayException(
        'Le logo doit être une image PNG ou JPEG valide.',
      );
    }
    return { bytes, contentType };
  }
}

function drawWrapped(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      page.drawText(line, { x, y: currentY, font, size, color });
      currentY -= size + 4;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) page.drawText(line, { x, y: currentY, font, size, color });
}
