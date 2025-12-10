import {
	Body,
	Controller,
	Delete,
	FileTypeValidator,
	Get,
	HttpCode,
	HttpStatus,
	MaxFileSizeValidator,
	Param,
	ParseFilePipe,
	Post,
	Put, UnauthorizedException,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { AlbumsService } from './albums.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { Album } from './schemas/album.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../auth/roles.decorator';
import { AuthGuard } from '../../auth/auth.guard';
import { SupabaseUser } from '../../auth/user.decorator';
import { type User as SbUser } from '@supabase/supabase-js';
import { BucketService } from '../../common/services/bucket.service';
import { Notification } from '../../common/schemas/notification.schema';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../../common/services/notification.service';

@Controller('albums')
export class AlbumsController {
	constructor(
		private readonly albumsService: AlbumsService,
		private readonly bucketService: BucketService,
		private readonly notificationService: NotificationService,
	) {}

	@Get()
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getAlbumByAuthorToken(@SupabaseUser() sbUser: SbUser): Promise<Album[]> {
		return await this.albumsService.findByAuthorUuid(sbUser.id);
	}

	@Get(':uuid')
	async getAlbumByUuid(@Param('uuid') uuid: string): Promise<Album> {
		return await this.albumsService.findOneByUuidAndPopulate(uuid);
	}

	@Post()
	@UseInterceptors(FileInterceptor('cover'))
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async create(
		@UploadedFile(
			new ParseFilePipe({
				validators: [
					new MaxFileSizeValidator({
						maxSize: 10 * 1024 * 1024,
					}),
					new FileTypeValidator({
						fileType: /(jpg|jpeg|png)$/,
					}),
				],
				fileIsRequired: true,
			}),
		)
		cover: Express.Multer.File,
		@Body() createAlbumDto: CreateAlbumDto,
		@SupabaseUser() sbUser: SbUser,
	): Promise<Album> {
		const album = await this.albumsService.create({
			...createAlbumDto,
			author: sbUser.id,
		});

		await this.bucketService.saveToAlbumCovers(album.uuid, cover);

		const notification: Notification = {
			message: 'Se ha publicado un nuevo álbum !!',
			type: 'Album',
			item: album._id,
			uuid: uuidv4(),
		};

		await this.notificationService.notifyFollowers(sbUser.id, notification);

		return album;
	}

	@Put(':uuid')
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async update(
		@Param('uuid') uuid: string,
		@Body() updateAlbumDto: UpdateAlbumDto,
		@SupabaseUser() sbUser: SbUser
	): Promise<Album> {
		updateAlbumDto.author = sbUser.id;
		return await this.albumsService.update(uuid, updateAlbumDto);
	}

	@Delete(':uuid')
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async delete(
		@Param('uuid') uuid: string,
		@SupabaseUser() sbUser: SbUser
	): Promise<void> {
		if (!(await this.albumsService.isAuthor(sbUser.id, uuid))) {
			throw new UnauthorizedException();
		}
		return await this.albumsService.deleteByUuid(uuid);
	}
}
