import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdatePricingDto } from './dto/update-pricing.dto.js';

const PRICE_KEYS = [
  'prix_cours_base',
  'prix_cours_avance',
  'prix_passage_avance',
  'prix_attestation',
  'duree_acces_jours',
  'prix_atelier',
  'prix_offre_emploi',
  'prix_sponsoring_trimestre',
  'delai_rappel_fin_acces_jours',
  'frais_paiement_pourcentage',
  'devise',
] as const;

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getValues() {
    const records = await this.prisma.priceSetting.findMany({
      where: { key: { in: [...PRICE_KEYS] } },
      orderBy: { key: 'asc' },
    });
    const values = Object.fromEntries(
      records.map(({ key, value }) => [key, value]),
    );
    const missing = PRICE_KEYS.filter((key) => values[key] === undefined);
    if (missing.length) {
      throw new ServiceUnavailableException(
        `Paramètres de prix manquants. Exécutez la commande d’initialisation en base de données. Clés : ${missing.join(', ')}.`,
      );
    }

    return {
      prix_cours_base: Number(values.prix_cours_base),
      prix_cours_avance: Number(values.prix_cours_avance),
      prix_passage_avance: Number(values.prix_passage_avance),
      prix_attestation: Number(values.prix_attestation),
      duree_acces_jours: Number(values.duree_acces_jours),
      prix_atelier: Number(values.prix_atelier),
      prix_offre_emploi: Number(values.prix_offre_emploi),
      prix_sponsoring_trimestre: Number(values.prix_sponsoring_trimestre),
      delai_rappel_fin_acces_jours: Number(
        values.delai_rappel_fin_acces_jours,
      ),
      frais_paiement_pourcentage: Number(
        values.frais_paiement_pourcentage,
      ),
      devise: values.devise,
    };
  }

  async getAdminValues() {
    const [pricing, history] = await Promise.all([
      this.prisma.priceSetting.findMany({
        where: { key: { in: [...PRICE_KEYS] } },
        orderBy: { key: 'asc' },
      }),
      this.prisma.priceChange.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { changedAt: 'desc' },
        take: 100,
      }),
    ]);
    return { pricing, history };
  }

  async update(input: UpdatePricingDto, adminId: string) {
    const entries = Object.entries(input).filter(
      (entry): entry is [string, string | number] => entry[1] !== undefined,
    );
    if (!entries.length) return this.getAdminValues();

    await this.prisma.$transaction(async (transaction) => {
      for (const [key, rawValue] of entries) {
        const newValue = String(rawValue);
        const old = await transaction.priceSetting.findUnique({
          where: { key },
        });
        if (old?.value === newValue) continue;

        await transaction.priceSetting.upsert({
          where: { key },
          update: { value: newValue, modifiedBy: adminId },
          create: { key, value: newValue, modifiedBy: adminId },
        });
        await transaction.priceChange.create({
          data: {
            key,
            oldValue: old?.value ?? null,
            newValue,
            modifiedBy: adminId,
          },
        });
      }
    });
    return this.getAdminValues();
  }
}
