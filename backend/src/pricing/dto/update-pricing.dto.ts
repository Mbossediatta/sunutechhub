import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdatePricingDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  prix_cours_base?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prix_cours_avance?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prix_passage_avance?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prix_attestation?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duree_acces_jours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prix_atelier?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prix_offre_emploi?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prix_sponsoring_trimestre?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  delai_rappel_fin_acces_jours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  frais_paiement_pourcentage?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3,8}$/)
  devise?: string;
}
