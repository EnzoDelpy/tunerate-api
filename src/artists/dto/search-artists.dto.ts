import { IsString } from 'class-validator';

export class SearchArtistsDto {
  @IsString()
  query: string;
}
