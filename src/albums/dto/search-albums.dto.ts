import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchAlbumsDto {
  @ApiProperty({
    description: 'Terme de recherche pour trouver des albums',
    example: 'Dark Side of the Moon',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Numéro de page pour la pagination (commence à 1)',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: "Nombre d'albums par page",
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
