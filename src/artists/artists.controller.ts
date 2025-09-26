import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { SearchArtistsDto } from './dto/search-artists.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('artists')
@ApiBearerAuth()
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @ApiOperation({
    summary: 'Rechercher des artistes',
    description: "Recherche des artistes par nom via l'API Spotify",
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des artistes correspondant à la recherche',
  })
  @UseGuards(JwtAuthGuard)
  @Get('search')
  search(@Query() searchArtistsDto: SearchArtistsDto) {
    return this.artistsService.searchArtists(searchArtistsDto.query);
  }

  @ApiOperation({
    summary: 'Lister tous les artistes',
    description:
      'Récupère tous les artistes enregistrés dans la base de données',
  })
  @ApiResponse({
    status: 200,
    description: "Liste de tous les artistes avec le nombre d'albums associés",
  })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.artistsService.findAll();
  }

  @ApiOperation({
    summary: "Obtenir les détails d'un artiste",
    description: "Récupère les informations détaillées d'un artiste par son ID",
  })
  @ApiParam({ name: 'id', description: "ID de l'artiste", type: 'number' })
  @ApiResponse({
    status: 200,
    description: "Détails de l'artiste et ses albums",
  })
  @ApiResponse({
    status: 404,
    description: 'Artiste non trouvé',
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.artistsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Obtenir un artiste par ID externe',
    description:
      "Récupère un artiste via son ID Spotify (crée l'artiste s'il n'existe pas encore)",
  })
  @ApiParam({
    name: 'externalId',
    description: "ID Spotify de l'artiste",
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: "Détails de l'artiste",
  })
  @UseGuards(JwtAuthGuard)
  @Get('external/:externalId')
  findByExternalId(@Param('externalId') externalId: string) {
    return this.artistsService.getArtistDetailsByExternalId(externalId);
  }

  @ApiOperation({
    summary: "Obtenir les albums d'un artiste",
    description: 'Récupère tous les albums associés à un artiste spécifique',
  })
  @ApiParam({ name: 'id', description: "ID de l'artiste", type: 'number' })
  @ApiResponse({
    status: 200,
    description: "Liste des albums de l'artiste",
  })
  @ApiResponse({
    status: 404,
    description: 'Artiste non trouvé',
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id/albums')
  getArtistAlbums(@Param('id', ParseIntPipe) id: number) {
    return this.artistsService.getArtistAlbums(id);
  }
}
