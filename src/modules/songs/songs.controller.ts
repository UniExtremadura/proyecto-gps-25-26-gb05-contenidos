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
	Put,
	Query,
	Res,
	UnauthorizedException,
	UploadedFiles,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { Song, SongFormats } from './schemas/song.schema';
import { AuthGuard } from '../../auth/auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BucketService } from '../../common/services/bucket.service';
import { parseBuffer } from 'music-metadata';
import { type User as SbUser } from '@supabase/supabase-js';
import { SupabaseUser } from '../../auth/user.decorator';
import { UsersService } from '../users/users.service';
import { Artist } from '../artists/schemas/artist.schema';
import type { Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationService } from '../../common/services/notification.service';
import { Notification } from '../../common/schemas/notification.schema';
import { v4 as uuidv4 } from 'uuid';
import {Album} from "../albums/schemas/album.schema";

const validSongFormats = [
	'audio/mpeg',
	'audio/aac',
	'audio/flac',
	'audio/x-flac',
	'audio/x-aac',
];
const validCoverFormats = ['image/jpg', 'image/jpeg', 'image/png'];

@Controller('songs')
export class SongsController {
	constructor(
		private readonly songsService: SongsService,
		private readonly bucketService: BucketService,
		private readonly usersService: UsersService,
		private readonly notificationService: NotificationService,
		@InjectQueue('songPreview') private songPreviewQueue: Queue,
		@InjectQueue('songTranscode') private songTranscodeQueue: Queue,
	) {}

	@Get()
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getSongsByAuthorToken(@SupabaseUser() sbUser: SbUser) {
		return this.songsService.findByAuthorUuid(sbUser.id);
	}

	@Get(':uuid')
	@HttpCode(HttpStatus.OK)
	async getSongByUuid(@Param('uuid') uuid: string): Promise<Song> {
		return await this.songsService.findOneByUuidAndPopulate(uuid);
	}

	@Get(':uuid/preview')
	@HttpCode(HttpStatus.OK)
	async getSongPreviewByUuid(@Param('uuid') uuid: string, @Res() res: Response) {
		const fileStream = await this.bucketService.getFromSongFilesAsStream(
			`${uuid}-preview`,
		);

		res.set({
			'Content-Type': 'audio/mpeg',
			'Content-Disposition': 'inline; filename="preview.mp3"',
			'Cache-Control': 'public, max-age=3600',
		});

		fileStream.pipe(res);
		fileStream.on('error', () => {
			res.status(500).send();
		});
	}

	@Get(':uuid/play')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async playSong(
		@Param('uuid') uuid: string,
		@SupabaseUser() sbUser: SbUser,
		@Res() res: Response,
	) {
		const song = await this.songsService.findOneByUuidAndPopulate(uuid);

		const user = await this.usersService.findOneByUuidAndPopulate(sbUser.id);
		const found = user.library.some((l) => {
			if (l.type === 'Song') {
				return l.item._id.toString() === song._id.toString();
			} else if (l.type === 'Album') {
				for (const s of (l.item as Album).songs) {
					if (s._id.toString() === song._id.toString()) {
						return true;
					}
				}
				return false;
			}
		});
		if (!found) {
			if (sbUser.role === 'user') throw new UnauthorizedException();
			const artist = await this.usersService.findOneByUuid(sbUser.id);
			if (artist.uuid !== (song.author as Artist).uuid) {
				throw new UnauthorizedException();
			}
		}
		const fileStream = await this.bucketService.getFromSongFilesAsStream(
			`${uuid}-mp3-128`,
		);

        await this.songsService.incrementPlays(uuid)

		res.set({
			'Content-Type': 'audio/mpeg',
			'Content-Disposition': 'inline; filename="song.mp3"',
			'Cache-Control': 'public, max-age=3600',
		});

		fileStream.pipe(res);
		fileStream.on('error', () => {
			res.status(500).send();
		});
	}

	@Get(':uuid/download')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async downloadSong(
		@Param('uuid') uuid: string,
		@Query('format') format: SongFormats,
		@SupabaseUser() sbUser: SbUser,
		@Res() res: Response,
	) {
		const song = await this.songsService.findOneByUuidAndPopulate(uuid);

		const user = await this.usersService.findOneByUuidAndPopulate(sbUser.id);
		const found = user.library.some((l) => {
			if (l.type === 'Song') {
				return l.item._id.toString() === song._id.toString();
			} else if (l.type === 'Album') {
				for (const s of (l.item as Album).songs) {
					if (s._id.toString() === song._id.toString()) {
						return true;
					}
				}
				return false;
			}
		});
		if (!found) {
			if (sbUser.role === 'user') throw new UnauthorizedException();
			const artist = await this.usersService.findOneByUuid(sbUser.id);
			if (artist.uuid !== (song.author as Artist).uuid) {
				throw new UnauthorizedException();
			}
		}

		const fileStream = await this.bucketService.getFromSongFilesAsStream(
			`${uuid}-${format}`,
		);

		res.set({
			'Content-Type': 'audio/mpeg',
			'Content-Disposition': 'inline; filename="song.mp3"',
			'Cache-Control': 'public, max-age=3600',
		});

		fileStream.pipe(res);
		fileStream.on('error', () => {
			res.status(500).send();
		});
	}

	@Post()
	@UseInterceptors(
		FileFieldsInterceptor(
			[
				{ name: 'file', maxCount: 1 },
				{ name: 'cover', maxCount: 1 },
			],
			{
				limits: { fileSize: 40 * 1024 * 1024 },
				fileFilter: (req, file, cb) => {
					if (
						file.fieldname === 'file' &&
						!validSongFormats.includes(file.mimetype)
					) {
						return cb(new BadRequestException(), false);
					}
					if (
						file.fieldname === 'cover' &&
						!validCoverFormats.includes(file.mimetype)
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
	@HttpCode(HttpStatus.CREATED)
	async postSong(
		@UploadedFiles()
		files: { file: Express.Multer.File[]; cover: Express.Multer.File[] },
		@Body() createSongDto: CreateSongDto,
		@SupabaseUser() sbUser: SbUser,
	): Promise<Song> {
		if (!files.file || !files.cover) throw new BadRequestException();

		const file = files.file[0];
		const cover = files.cover[0];

		const fileMetadata = await parseBuffer(file.buffer, file.mimetype);
		const duration = fileMetadata.format.duration || 0;

		const song = await this.songsService.create({
			...createSongDto,
			duration: Math.floor(duration),
			author: sbUser.id,
		});

		await this.bucketService.saveToSongFiles(
			song.uuid,
			file.buffer,
			file.mimetype,
		);
		await this.bucketService.saveToSongCovers(song.uuid, cover);

		this.songPreviewQueue.add('songPreview', {
			uuid: song.uuid,
		});

		this.songTranscodeQueue.add('songTranscode', {
			uuid: song.uuid,
			format: SongFormats.MP3320,
		});
		this.songTranscodeQueue.add('songTranscode', {
			uuid: song.uuid,
			format: SongFormats.MP3128,
		});

		if (file.mimetype === 'audio/flac' || file.mimetype === 'audio/x-flac') {
			this.songTranscodeQueue.add('songTranscode', {
				uuid: song.uuid,
				format: SongFormats.AAC,
			});
			this.songTranscodeQueue.add('songTranscode', {
				uuid: song.uuid,
				format: SongFormats.FLAC,
			});
		} else if (file.mimetype === 'audio/aac' || file.mimetype === 'audio/x-aac') {
			this.songTranscodeQueue.add('songTranscode', {
				uuid: song.uuid,
				format: SongFormats.AAC,
			});
		}

		const notification: Notification = {
			message: 'Se ha publicado una nueva canción !!',
			type: 'Song',
			item: song._id,
			uuid: uuidv4(),
		};

		await this.notificationService.notifyFollowers(sbUser.id, notification);
		return song;
	}

	@Put(':uuid')
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async update(
		@Param('uuid') uuid: string,
		@Body() updateSongDto: UpdateSongDto,
		@SupabaseUser() sbUser: SbUser
	): Promise<Song> {
		updateSongDto.author = sbUser.id;
		return await this.songsService.update(uuid, updateSongDto);
	}

	@Delete(':uuid')
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async deleteFromUuid(
		@Param('uuid') uuid: string,
		@SupabaseUser() sbUser: SbUser
	): Promise<void> {
		if (!(await this.songsService.isAuthor(sbUser.id, uuid))) {
			throw new UnauthorizedException();
		}
		return await this.songsService.deleteByUuid(uuid);
	}
}
