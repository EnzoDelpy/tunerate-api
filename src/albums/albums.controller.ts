import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AlbumsService } from './albums.service';
import { SearchAlbumsDto } from './dto/search-albums.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('albums')
@ApiBearerAuth()
@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @ApiOperation({ summary: 'Rechercher des albums' })
  @ApiResponse({
    status: 200,
    description: 'Liste des albums correspondant à la recherche',
  })
  @UseGuards(JwtAuthGuard)
  @Get('search')
  search(@Query() searchAlbumsDto: SearchAlbumsDto) {
    return this.albumsService.searchAlbums(searchAlbumsDto.query);
  }

  @ApiOperation({ summary: "Tester la validité d'un ID d'album Spotify" })
  @ApiParam({ name: 'id', description: 'ID externe à tester', type: 'string' })
  @ApiResponse({
    status: 200,
    description: "Résultat du test de validité de l'ID",
  })
  @UseGuards(JwtAuthGuard)
  @Get('test/:id')
  async testAlbumId(@Param('id') externalId: string) {
    const isValid = await this.albumsService.testAlbumId(externalId);
    return {
      id: externalId,
      isValid: isValid,
      message: isValid
        ? 'ID is valid in Spotify'
        : 'ID is not valid in Spotify',
    };
  }

  @ApiOperation({ summary: 'Récupérer un album par son ID externe (Spotify)' })
  @ApiParam({
    name: 'externalId',
    description: "ID externe de l'album",
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: "Détails de l'album",
  })
  @ApiResponse({
    status: 404,
    description: 'Album non trouvé',
  })
  @ApiResponse({
    status: 500,
    description: "Erreur lors de la récupération des détails de l'album",
  })
  @UseGuards(JwtAuthGuard)
  @Get('external/:externalId')
  async findByExternalId(@Param('externalId') externalId: string) {
    try {
      return await this.albumsService.getAlbumDetailsByExternalId(externalId);
    } catch (error) {
      // Pour tout autre erreur, ou si aucune correspondance exacte n'est trouvée, renvoyer l'erreur
      console.error(
        `Error finding album with external ID ${externalId}:`,
        error.message,
      );

      // Assurons-nous de toujours renvoyer une erreur 404 claire plutôt qu'une erreur 500
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new NotFoundException(`Album with ID ${externalId} not found`);
      }
    }
  }

  @ApiOperation({ summary: 'Récupérer tous les albums' })
  @ApiResponse({
    status: 200,
    description: 'Liste de tous les albums',
  })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.albumsService.findAll();
  }

  @ApiOperation({ summary: 'Récupérer un album par son ID' })
  @ApiParam({ name: 'id', description: "ID de l'album", type: 'number' })
  @ApiResponse({
    status: 200,
    description: "Détails de l'album",
  })
  @ApiResponse({
    status: 404,
    description: 'Album non trouvé',
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.albumsService.findOne(id);
  }

  @ApiOperation({ summary: "Obtenir la note moyenne d'un album" })
  @ApiParam({ name: 'id', description: "ID de l'album", type: 'number' })
  @ApiResponse({
    status: 200,
    description: "Note moyenne et nombre d'avis",
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id/rating')
  getAlbumRating(@Param('id', ParseIntPipe) id: number) {
    return this.albumsService.getAlbumRating(id);
  }
}
