import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put, UploadedFiles,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { Artist } from './schemas/artist.schema';
import { Roles } from '../../auth/roles.decorator';
import { AuthGuard } from '../../auth/auth.guard';
import { SongsService } from "../songs/songs.service";
import { AlbumsService } from "../albums/albums.service";
import { ProductsService } from "../products/products.service";
import { Song } from "../songs/schemas/song.schema";
import { Album } from "../albums/schemas/album.schema";
import { Product } from "../products/schemas/product.schema";
import { SupabaseUser } from "../../auth/user.decorator";
import { type User as SbUser } from '@supabase/supabase-js';
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { BucketService } from '../../common/services/bucket.service';

const validImgFormats = ['image/jpg', 'image/jpeg', 'image/png'];

@Controller('artists')
export class ArtistsController {
	constructor(
        private readonly artistsService: ArtistsService,
        private readonly songsService: SongsService,
        private readonly albumsService: AlbumsService,
        private readonly productsService: ProductsService,
        private readonly bucketService: BucketService,
    ) {}

    @Get()
    async getAllArtists(): Promise<Artist[]> {
        return await this.artistsService.findAll();
    }

    @Get('/profile')
    @Roles(['artist'])
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    async getArtistByTokenSession(
        @SupabaseUser() sbUser: SbUser,
    ) {
        return await this.artistsService.findOneByUuidAndPopulate(sbUser.id);
    }

    @Get(':uuid')
    async getArtistByUuid(@Param('uuid') uuid: string) {
        return await this.artistsService.findOneByUuidAndPopulate(uuid);
    }

    @Get(':uuid/songs')
    async getSongsByArtistUuid(@Param('uuid') uuid: string): Promise<Song[]> {
        return await this.songsService.findByAuthorUuid(uuid);
    }

    @Get(':uuid/albums')
    async getAlbumsByArtistUuid(@Param('uuid') uuid: string): Promise<Album[]> {
        return await this.albumsService.findByAuthorUuid(uuid);
    }

    @Get(':uuid/products')
    async getProductsByArtistUuid(@Param('uuid') uuid: string): Promise<Product[]> {
        return await this.productsService.findByAuthorUuid(uuid);
    }

	@Post()
	@Roles(['admin'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async postArtist(@Body() createArtistDto: CreateArtistDto) {
		return await this.artistsService.create(createArtistDto);
	}

    @Put(':uuid')
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'profileImg', maxCount: 1 },
                { name: 'bannerImg', maxCount: 1 },
            ],
            {
                limits: { fileSize: 40 * 1024 * 1024 },
                fileFilter: (req, file, cb) => {
                    if (
                        file.fieldname === 'profileImg' &&
                        !validImgFormats.includes(file.mimetype)
                    ) {
                        return cb(new BadRequestException(), false);
                    }
                    if (
                        file.fieldname === 'bannerImg' &&
                        !validImgFormats.includes(file.mimetype)
                    ) {
                        return cb(new BadRequestException(), false);
                    }

                    return cb(null, true);
                },
            },
        ),
    )
    @Roles(['artist'])
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    async updateArtist(
        @Param('uuid') uuid: string,
        @UploadedFiles()
        files: { profileImg: Express.Multer.File[], bannerImg: Express.Multer.File[] },
        @Body() updateArtistDto: UpdateArtistDto,
        @SupabaseUser() sbUser: SbUser,
    ) : Promise<Artist> {

        const profileImg = files?.profileImg?.[0];
        const bannerImg = files?.bannerImg?.[0];

        const updatedArtist = await this.artistsService.update(uuid, sbUser.id, {
            ...updateArtistDto,
        });

        // Guardar imagen de perfil
        if (profileImg) {
            await this.bucketService.saveToArtistProfiles(updatedArtist.uuid, profileImg);
        }

        // Guardar imagen de banner
        if (bannerImg) {
            await this.bucketService.saveToArtistBanners(updatedArtist.uuid, bannerImg);
        }

        return await this.artistsService.update(uuid, sbUser.id, updateArtistDto);
    }

	@Delete(':uuid')
	@Roles(['admin'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async deleteArtistByUuid(@Param('uuid') uuid: string) {
		return await this.artistsService.delete(uuid);
	}

    /* Lógica de seguidores */
    @Post(':uuid/follow')
    @Roles(['user', 'artist'])
    @UseGuards(AuthGuard)
    async followArtist(
        @Param('uuid') uuid: string,
        @SupabaseUser() user: SbUser,
    ) {
        return this.artistsService.followArtist(uuid, user.id);
    }

    @Post(':uuid/unfollow')
    @Roles(['user', 'artist'])
    @UseGuards(AuthGuard)
    async unfollowArtist(
        @Param('uuid') uuid: string,
        @SupabaseUser() user: SbUser,
    ) {
        return this.artistsService.unfollowArtist(uuid, user.id);
    }

    @Get(':uuid/is-following')
    @Roles(['user', 'artist'])
    @UseGuards(AuthGuard)
    async isFollowing(
        @Param('uuid') uuid: string,
        @SupabaseUser() user: SbUser,
    ) {
        return await this.artistsService.isFollowingArtist(uuid, user.id);
    }
}
