import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchAlbumsDto {
  @ApiProperty({
    description: 'Terme de recherche pour trouver des albums',
    example: 'Dark Side of the Moon',
  })
  @IsString()
  query: string;
}
