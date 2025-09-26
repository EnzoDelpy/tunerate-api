import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiOperation({
    summary: 'Créer une nouvelle critique',
    description:
      'Permet à un utilisateur connecté de publier une critique sur un album',
  })
  @ApiBody({
    type: CreateReviewDto,
    description: 'Données de la critique à créer',
  })
  @ApiResponse({
    status: 201,
    description: 'Critique créée avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(user.id, createReviewDto);
  }

  @ApiOperation({
    summary: 'Lister toutes les critiques',
    description: 'Récupère toutes les critiques avec pagination',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: "Nombre d'éléments à sauter (pagination)",
    type: Number,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: "Nombre d'éléments à récupérer (pagination)",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des critiques',
  })
  @Get()
  findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.reviewsService.findAll(skip || 0, take || 10);
  }

  @ApiOperation({
    summary: "Lister les critiques d'un album",
    description:
      "Récupère toutes les critiques d'un album spécifique avec pagination",
  })
  @ApiParam({ name: 'albumId', description: "ID de l'album", type: 'number' })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: "Nombre d'éléments à sauter",
    type: Number,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: "Nombre d'éléments à récupérer",
    type: Number,
  })
  @ApiResponse({ status: 200, description: "Liste des critiques de l'album" })
  @Get('album/:albumId')
  findByAlbumId(
    @Param('albumId', ParseIntPipe) albumId: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.reviewsService.findByAlbumId(albumId, skip || 0, take || 10);
  }

  @ApiOperation({
    summary: "Lister les critiques d'un utilisateur",
    description:
      'Récupère toutes les critiques publiées par un utilisateur spécifique',
  })
  @ApiParam({
    name: 'userId',
    description: "ID de l'utilisateur",
    type: 'number',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: "Nombre d'éléments à sauter",
    type: Number,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: "Nombre d'éléments à récupérer",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Liste des critiques de l'utilisateur",
  })
  @Get('user/:userId')
  findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.reviewsService.findByUserId(userId, skip || 0, take || 10);
  }

  @ApiOperation({
    summary: 'Obtenir une critique par son ID',
    description: "Récupère les détails d'une critique spécifique",
  })
  @ApiParam({ name: 'id', description: 'ID de la critique', type: 'number' })
  @ApiResponse({ status: 200, description: 'Détails de la critique' })
  @ApiResponse({ status: 404, description: 'Critique non trouvée' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Modifier une critique',
    description: 'Permet à un utilisateur de modifier sa propre critique',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la critique à modifier',
    type: 'number',
  })
  @ApiBody({
    type: UpdateReviewDto,
    description: 'Nouvelles données de la critique',
  })
  @ApiResponse({ status: 200, description: 'Critique modifiée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Interdit - Vous ne pouvez modifier que vos propres critiques',
  })
  @ApiResponse({ status: 404, description: 'Critique non trouvée' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, user.id, updateReviewDto);
  }

  @ApiOperation({
    summary: 'Supprimer une critique',
    description: 'Permet à un utilisateur de supprimer sa propre critique',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la critique à supprimer',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'Critique supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description:
      'Interdit - Vous ne pouvez supprimer que vos propres critiques',
  })
  @ApiResponse({ status: 404, description: 'Critique non trouvée' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    return this.reviewsService.remove(id, user.id);
  }
}
