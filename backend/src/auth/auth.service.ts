import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthMailerService } from './auth-mailer.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: AuthMailerService,
  ) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('Cette adresse e-mail est déjà utilisée.');

    const user = await this.prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash: await hash(input.password, 12),
        interests: input.interests ?? [],
        newsletterSubscribed: input.newsletterSubscribed ?? false,
        newsletterSubscribedAt: input.newsletterSubscribed ? new Date() : null,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    const session = await this.issueToken(user);
    return {
      ...session,
      welcomeEmailSent: await this.mailer.sendWelcomeEmail(
        user.email,
        user.name,
      ),
    };
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });
    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException(
        'Adresse e-mail ou mot de passe incorrect.',
      );
    }
    return this.issueToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }

  getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        city: true,
        bio: true,
        interests: true,
        newsletterSubscribed: true,
        createdAt: true,
        registrations: {
          include: { course: { select: { id: true, title: true, isFree: true } } },
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: {
            projects: true,
            questions: { where: { status: { not: 'HIDDEN' } } },
            answers: { where: { hidden: false } },
          },
        },
      },
    });
  }

  async updateProfile(userId: string, input: UpdateProfileDto) {
    const currentSubscription =
      input.newsletterSubscribed === undefined
        ? null
        : await this.prisma.user.findUnique({
            where: { id: userId },
            select: { newsletterSubscribed: true },
          });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name?.trim(),
        city:
          input.city === undefined
            ? undefined
            : input.city?.trim() || null,
        bio:
          input.bio === undefined
            ? undefined
            : input.bio?.trim() || null,
        interests:
          input.interests === undefined
            ? undefined
            : [...new Set(input.interests.map((interest) => interest.trim()).filter(Boolean))],
        newsletterSubscribed: input.newsletterSubscribed,
        newsletterSubscribedAt:
          input.newsletterSubscribed === undefined
            ? undefined
            : input.newsletterSubscribed &&
                !currentSubscription?.newsletterSubscribed
              ? new Date()
              : input.newsletterSubscribed
                ? undefined
                : null,
      },
    });
    return this.getProfile(userId);
  }

  async getPublicProfile(userId: string) {
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        city: true,
        bio: true,
        interests: true,
        createdAt: true,
        registrations: {
          include: { course: { select: { id: true, title: true } } },
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: {
            projects: { where: { status: 'APPROVED' } },
            questions: { where: { status: { not: 'HIDDEN' } } },
            answers: { where: { hidden: false } },
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Profil introuvable.');
    return profile;
  }

  async requestMagicLink(emailInput: string) {
    if (!this.mailer.isConfigured()) {
      throw new ServiceUnavailableException(
        'La connexion par lien magique nécessite la configuration de l’envoi e-mail.',
      );
    }

    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });
    const message =
      'Si un compte correspond à cette adresse, un lien de connexion sera envoyé.';
    if (!user) return { message };

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    await this.prisma.magicLinkToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });
    const tokenRecord = await this.prisma.magicLinkToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const frontendUrl = this.config
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/+$/, '');
    const link = `${frontendUrl}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`;
    try {
      await this.mailer.sendMagicLink(user.email, user.name, link);
    } catch (error) {
      await this.prisma.magicLinkToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });
      throw error;
    }
    return { message };
  }

  async verifyMagicLink(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const tokenRecord = await this.prisma.magicLinkToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (
      !tokenRecord ||
      tokenRecord.usedAt ||
      tokenRecord.expiresAt <= now
    ) {
      throw new UnauthorizedException(
        'Ce lien de connexion est invalide ou a expiré. Demande-en un nouveau.',
      );
    }

    const consumed = await this.prisma.magicLinkToken.updateMany({
      where: {
        id: tokenRecord.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException(
        'Ce lien de connexion est invalide ou a expiré. Demande-en un nouveau.',
      );
    }

    return this.issueToken(tokenRecord.user);
  }

  getGoogleAuthorizationUrl(state: string) {
    if (!/^[\da-zA-Z_-]{43}$/.test(state)) {
      throw new UnauthorizedException('Requête Google invalide.');
    }

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new ServiceUnavailableException(
        'La connexion Google n’est pas encore configurée.',
      );
    }

    const callbackUrl = this.googleCallbackUrl();
    const authorizationUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    }).toString();
    return { authorizationUrl: authorizationUrl.toString() };
  }

  async loginWithGoogle(code: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'La connexion Google n’est pas encore configurée.',
      );
    }

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: this.googleCallbackUrl(),
          grant_type: 'authorization_code',
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Le service Google est momentanément injoignable.',
      );
    }

    if (!tokenResponse.ok) {
      const tokenError: unknown = await tokenResponse.json().catch(() => null);
      const code =
        tokenError &&
        typeof tokenError === 'object' &&
        'error' in tokenError &&
        typeof tokenError.error === 'string'
          ? tokenError.error
          : '';
      if (code === 'invalid_client') {
        throw new UnauthorizedException(
          'La configuration Google est invalide. Vérifie le Client ID et le Client Secret.',
        );
      }
      if (code === 'redirect_uri_mismatch') {
        throw new UnauthorizedException(
          'L’adresse de retour Google ne correspond pas à celle autorisée dans Google Cloud Console.',
        );
      }
      if (code === 'invalid_grant') {
        throw new UnauthorizedException(
          'Le code Google a expiré ou a déjà été utilisé. Réessaie la connexion.',
        );
      }
      throw new UnauthorizedException(
        'La vérification de la connexion Google a échoué. Vérifie le Client ID, le Client Secret et l’URI de retour autorisée.',
      );
    }

    const tokenPayload: unknown = await tokenResponse.json().catch(() => null);
    if (
      !tokenPayload ||
      typeof tokenPayload !== 'object' ||
      !('access_token' in tokenPayload) ||
      typeof tokenPayload.access_token !== 'string'
    ) {
      throw new UnauthorizedException('Réponse Google invalide.');
    }

    let profileResponse: Response;
    try {
      profileResponse = await fetch(
        'https://openidconnect.googleapis.com/v1/userinfo',
        {
          headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Le service Google est momentanément injoignable.',
      );
    }

    if (!profileResponse.ok) {
      throw new UnauthorizedException(
        'Google n’a pas pu vérifier ce compte. Réessaie.',
      );
    }

    const profile: unknown = await profileResponse.json().catch(() => null);
    if (
      !profile ||
      typeof profile !== 'object' ||
      !('sub' in profile) ||
      typeof profile.sub !== 'string' ||
      !('email' in profile) ||
      typeof profile.email !== 'string' ||
      !('email_verified' in profile) ||
      profile.email_verified !== true
    ) {
      throw new UnauthorizedException(
        'Google doit confirmer l’adresse e-mail du compte.',
      );
    }

    const email = profile.email.trim().toLowerCase();
    const googleSubject = profile.sub;
    const linkedUser = await this.prisma.user.findUnique({
      where: { googleSubject },
      select: { id: true, name: true, email: true, role: true },
    });
    if (linkedUser) return this.issueToken(linkedUser);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        googleSubject: true,
      },
    });
    if (existingUser?.googleSubject) {
      throw new ConflictException(
        'Cette adresse est déjà liée à un autre compte Google.',
      );
    }

    const name =
      'name' in profile && typeof profile.name === 'string'
        ? profile.name.trim().slice(0, 100)
        : email.split('@')[0];

    const isNewUser = !existingUser;
    const user = existingUser
      ? await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { googleSubject },
          select: { id: true, name: true, email: true, role: true },
        })
      : await this.prisma.user.create({
          data: {
            name: name || email.split('@')[0],
            email,
            googleSubject,
            passwordHash: await hash(randomBytes(32).toString('hex'), 12),
          },
          select: { id: true, name: true, email: true, role: true },
        });

    const session = await this.issueToken(user);
    if (!isNewUser) return session;

    const welcomeEmailSent = await this.mailer.sendWelcomeEmail(
      user.email,
      user.name,
    );
    return { ...session, welcomeEmailSent };
  }

  private googleCallbackUrl() {
    const frontendUrl = this.config
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/+$/, '');
    return `${frontendUrl}/api/auth/google/callback`;
  }

  private async issueToken(user: {
    id: string;
    name: string;
    email: string;
    role: string;
  }) {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      tokenType: 'Bearer',
      user,
    };
  }
}
