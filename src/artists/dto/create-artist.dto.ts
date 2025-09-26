import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateArtistDto {
  @IsNotEmpty()
  @IsString()
  externalId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
