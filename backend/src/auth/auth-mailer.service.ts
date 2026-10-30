import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    const password =
      this.config.get<string>('SMTP_PASSWORD') ||
      this.config.get<string>('SMTP_PASS');
    return Boolean(
      this.config.get<string>('SMTP_HOST') &&
      this.config.get<string>('SMTP_USER') &&
      password &&
      this.config.get<string>('SMTP_FROM'),
    );
  }

  async sendWelcomeEmail(email: string, name: string) {
    if (!this.isConfigured()) {
      this.logger.warn(
        'E-mail de bienvenue non envoyé : configurez les paramètres SMTP.',
      );
      return false;
    }

    try {
      await this.send(
        email,
        'Bienvenue sur Sunu Tech Hub',
        [
          `Bonjour ${name},`,
          '',
          'Bienvenue sur Sunu Tech Hub ! Votre compte est prêt.',
          'Vous pouvez dès maintenant découvrir les questions et les cours gratuits.',
          '',
          this.frontendUrl(),
          '',
          'À bientôt,',
          'L’équipe Sunu Tech Hub',
        ].join('\n'),
      );
      return true;
    } catch {
      this.logger.error(
        'Échec de l’envoi de l’e-mail de bienvenue. Vérifiez la configuration SMTP.',
      );
      return false;
    }
  }

  async sendMagicLink(email: string, name: string, link: string) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'La connexion par lien magique nécessite la configuration de l’envoi e-mail.',
      );
    }

    try {
      await this.send(
        email,
        'Votre lien de connexion Sunu Tech Hub',
        [
          `Bonjour ${name},`,
          '',
          'Voici votre lien de connexion à usage unique. Il expire dans 15 minutes :',
          link,
          '',
          'Si vous n’avez pas demandé ce lien, ignorez cet e-mail.',
          '',
          'Sunu Tech Hub',
        ].join('\n'),
      );
    } catch {
      this.logger.error(
        'Échec de l’envoi d’un lien magique. Vérifiez la configuration SMTP.',
      );
      throw new ServiceUnavailableException(
        'Impossible d’envoyer le lien de connexion. Réessaie plus tard.',
      );
    }
  }

  private frontendUrl() {
    return this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/+$/, '');
  }

  private async send(to: string, subject: string, text: string) {
    const host = this.config.getOrThrow<string>('SMTP_HOST');
    const from = this.config.getOrThrow<string>('SMTP_FROM');
    const transporter: Transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      connectionTimeout: 3_000,
      greetingTimeout: 3_000,
      socketTimeout: 5_000,
      auth: {
        user: this.config.getOrThrow<string>('SMTP_USER'),
        pass: this.smtpPassword(),
      },
    });

    try {
      await transporter.sendMail({ from, to, subject, text });
    } finally {
      transporter.close();
    }
  }

  private smtpPassword() {
    const password =
      this.config.get<string>('SMTP_PASSWORD') ||
      this.config.get<string>('SMTP_PASS');
    if (!password) {
      throw new ServiceUnavailableException(
        'Le mot de passe SMTP est absent. Configure SMTP_PASSWORD ou SMTP_PASS.',
      );
    }
    return password;
  }
}
