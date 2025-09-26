import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: "ID de l'album à noter",
    example: 1,
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  albumId: number;

  @ApiProperty({
    description: "Note attribuée à l'album (entre 1 et 5)",
    example: 4,
    minimum: 1,
    maximum: 5,
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: "Commentaire détaillant l'avis sur l'album",
    example: 'Un album exceptionnel avec des mélodies inoubliables.',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
