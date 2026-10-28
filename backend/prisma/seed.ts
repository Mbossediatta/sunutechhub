import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const initialPricing = [
  ['prix_cours_base', '1000'],
  ['prix_cours_avance', '3000'],
  ['prix_passage_avance', '2000'],
  ['prix_attestation', '2000'],
  ['duree_acces_jours', '30'],
  ['prix_atelier', '5000'],
  ['prix_offre_emploi', '15000'],
  ['prix_sponsoring_trimestre', '150000'],
  ['delai_rappel_fin_acces_jours', '3'],
  ['frais_paiement_pourcentage', '0'],
  ['devise', 'FCFA'],
] as const;

async function seed() {
  for (const [key, value] of initialPricing) {
    await prisma.priceSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const passwordHash = await hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: {
        name: process.env.ADMIN_NAME ?? 'Administration Sunu Tech Hub',
        passwordHash,
        role: 'ADMIN',
      },
      create: {
        email,
        name: process.env.ADMIN_NAME ?? 'Administration Sunu Tech Hub',
        passwordHash,
        role: 'ADMIN',
      },
    });
  }
}

seed()
  .catch((error: unknown) => {
    console.error('Échec de l’initialisation des données.', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
