import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttestationStatus } from '@prisma/client';
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
    });
    if (!attestation)
      throw new NotFoundException('Attestation de réussite introuvable.');
    return this.prisma.attestation.update({
      where: { number },
      data: {
        status: AttestationStatus.REVOKED,
        revokedAt: new Date(),
        revokedById: adminId,
        revocationReason: input.reason.trim(),
      },
      select: { number: true, status: true, revokedAt: true },
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
    page.drawRectangle({ x: 22, y: 22, width: 798, height: 6, color: violet });
    page.drawText('Sunu Tech Hub', {
      x: 48,
      y: 526,
      font: bold,
      size: 17,
      color: navy,
    });
    page.drawText('ATTESTATION DE RÉUSSITE', {
      x: 48,
      y: 474,
      font: bold,
      size: 26,
      color: cobalt,
    });
    page.drawText('Sunu Tech Hub atteste que', {
      x: 48,
      y: 431,
      font: regular,
      size: 14,
      color: muted,
    });
    drawWrapped(page, attestation.user.name, 48, 390, 600, bold, 26, navy);
    page.drawText('a suivi et réussi le cours', {
      x: 48,
      y: 348,
      font: regular,
      size: 14,
      color: muted,
    });
    drawWrapped(page, attestation.course.title, 48, 316, 600, bold, 19, navy);
    page.drawText('Compétences validées', {
      x: 48,
      y: 273,
      font: bold,
      size: 12,
      color: cobalt,
    });
    drawWrapped(
      page,
      attestation.course.subjects.slice(0, 6).join(' · ') ||
        attestation.course.title,
      48,
      251,
      575,
      regular,
      11,
      navy,
    );
    page.drawText(
      `Projet rendu : ${attestation.payment.project?.title ?? 'Projet validé'}`,
      {
        x: 48,
        y: 209,
        font: regular,
        size: 11,
        color: navy,
        maxWidth: 620,
      },
    );
    page.drawText(
      `Délivrée le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Africa/Dakar' }).format(attestation.issuedAt)} · Durée du cours : ${attestation.course.duration || 'Non renseignée'}`,
      { x: 48, y: 179, font: regular, size: 10, color: muted, maxWidth: 650 },
    );
    page.drawText(`Formateur : ${attestation.course.instructorName}`, {
      x: 48,
      y: 145,
      font: bold,
      size: 11,
      color: navy,
    });
    page.drawText(`Numéro unique : ${attestation.number}`, {
      x: 48,
      y: 121,
      font: regular,
      size: 10,
      color: muted,
    });
    page.drawImage(qrImage, { x: 676, y: 112, width: 112, height: 112 });
    page.drawText('Vérifier cette attestation', {
      x: 665,
      y: 96,
      font: regular,
      size: 9,
      color: cobalt,
    });
    drawWrapped(page, ATTESTATION_NOTICE, 48, 64, 730, regular, 9, navy);

    return Buffer.from(await document.save());
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
