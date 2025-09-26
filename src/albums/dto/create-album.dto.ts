import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlbumDto {
  @ApiProperty({
    description: "Identifiant externe de l'album (ID Spotify)",
    example: '4aawyAB9vmqN3uQ7FjRGTy',
  })
  @IsNotEmpty()
  @IsString()
  externalId: string;

  @ApiProperty({
    description: "Titre de l'album",
    example: 'Dark Side of the Moon',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: "Date de sortie de l'album (format ISO)",
    example: '1973-03-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiProperty({
    description: "URL de la pochette de l'album",
    example: 'https://example.com/album-cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiProperty({
    description: "Identifiant externe de l'artiste (ID Spotify)",
    example: '0k17h0D3J5VfsdmQ1iZtE9',
  })
  @IsNotEmpty()
  @IsString()
  artistExternalId: string;
}
