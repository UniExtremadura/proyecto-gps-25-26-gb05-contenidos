import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Song, SongFormats } from './schemas/song.schema';
import { Model, Types } from 'mongoose';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { ArtistsService } from '../artists/artists.service';
import { ElasticsearchSyncService } from '../../common/services/elasticsearch-sync.service';
import { GenresService } from '../genres/genres.service';
import { BucketService } from '../../common/services/bucket.service';
import { Readable } from 'stream';
import { createWriteStream } from 'node:fs';
import * as stream from 'node:stream';
import { UsersService } from '../users/users.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SongsService {
	constructor(
		@InjectModel(Song.name) private songModel: Model<Song>,
		private readonly artistsService: ArtistsService,
		private readonly genresService: GenresService,
		private readonly elasticsearchSyncService: ElasticsearchSyncService,
		private readonly bucketService: BucketService,
	) {}

	async isAuthor(artistUuid: string, songUuid: string) {
		const artist = await this.artistsService.findOneByUuid(artistUuid);
		const song = await this.findOneByUuid(songUuid);
		return artist._id.toString() === song.author._id.toString();
	}

	async findAll(): Promise<Song[]> {
		return this.songModel.find();
	}

	async findByAuthorUuid(authorUuid: string): Promise<Song[]> {
		const artist = await this.artistsService.findOneByUuid(authorUuid);
		return this.songModel
			.find({ author: artist._id })
			.sort({ releaseDate: -1 })
			.populate(['author', 'featuring', 'genres']);
	}

	async findOneByUuid(uuid: string): Promise<Song> {
		const song = await this.songModel.findOne({ uuid });
		if (!song) throw new NotFoundException();
		return song;
	}

	async findOneByIdAndPopulate(id: Types.ObjectId): Promise<Song> {
		const song = await this.songModel
			.findById(id)
			.populate(['author', 'featuring', 'genres']);
		if (!song) throw new NotFoundException();
		return song;
	}

	async findOneByUuidAndPopulate(uuid: string): Promise<Song> {
		const song = await this.songModel
			.findOne({ uuid })
			.populate(['author', 'featuring', 'genres']);
		if (!song) throw new NotFoundException();
		return song;
	}

	async create(createSongDto: CreateSongDto): Promise<Song> {
		const artist = await this.artistsService.findOneByUuid(createSongDto.author);
		const featIds: Types.ObjectId[] = [];
		const genreIds: Types.ObjectId[] = [];

		for (const featUuid of createSongDto.featuring) {
			if (featUuid === createSongDto.author) throw new BadRequestException();
			const feat = await this.artistsService.findOneByUuid(featUuid);
			featIds.push(feat._id);
		}
		for (const genreUuid of createSongDto.genres) {
			const genre = await this.genresService.findOneByUuid(genreUuid);
			genreIds.push(genre._id);
		}

		const createdSong = new this.songModel({
			...createSongDto,
			author: artist._id,
			featuring: featIds,
			genres: genreIds,
		});

		createdSong.cover = `${process.env.APP_BASE_URL}/static/public/song-covers/${createdSong.uuid}`;

		try {
			const song = await createdSong.save();
			const populatedSong = await this.findOneByUuidAndPopulate(song.uuid);
			const aux: any = (populatedSong as any).toObject();
			delete aux._id;
			await this.elasticsearchSyncService.create('releases', 'song', song.uuid, {
				...aux,
				maxPrice: Math.max(
					populatedSong.pricing.digital,
					populatedSong.pricing.cd,
					populatedSong.pricing.cassette,
					populatedSong.pricing.vinyl,
				),
				minPrice: Math.min(
					populatedSong.pricing.digital,
					populatedSong.pricing.cd,
					populatedSong.pricing.cassette,
					populatedSong.pricing.vinyl,
				),
			});
			return populatedSong;
		} catch (error) {
			console.log(error);
			throw new InternalServerErrorException();
		}
	}

	async update(uuid: string, updateSongDto: UpdateSongDto): Promise<Song> {
		const song = await this.findOneByUuid(uuid);
		const artist = await this.artistsService.findOneById(song.author.toString());
		if (artist.uuid !== updateSongDto.author) {
			throw new UnauthorizedException();
		}

		const featIds: Types.ObjectId[] = [];
		const genreIds: Types.ObjectId[] = [];

		if (updateSongDto.featuring) {
			for (const featUuid of updateSongDto.featuring) {
				if (featUuid === updateSongDto.author) throw new BadRequestException();
				const feat = await this.artistsService.findOneByUuid(featUuid);
				featIds.push(feat._id);
			}
		}
		if (updateSongDto.genres) {
			for (const genreUuid of updateSongDto.genres) {
				const genre = await this.genresService.findOneByUuid(genreUuid);
				genreIds.push(genre._id);
			}
		}

		const updatedSong = await this.songModel.findOneAndUpdate(
			{ uuid },
			{
				...updateSongDto,
				author: song.author,
				featuring: updateSongDto.featuring ? featIds : song.featuring,
				genres: updateSongDto.genres ? genreIds : song.genres,
				pricing: {
					cd: updateSongDto.pricing?.cd ?? song.pricing.cd,
					vinyl: updateSongDto.pricing?.vinyl ?? song.pricing.vinyl,
					cassette: updateSongDto.pricing?.cassette ?? song.pricing.cassette,
					digital: updateSongDto.pricing?.digital ?? song.pricing.digital
				}
			},
			{ new: true }
		);
		const populatedSong = await this.findOneByUuidAndPopulate(updatedSong!.uuid);
		const aux: any = (populatedSong as any).toObject();
		delete aux._id;
		await this.elasticsearchSyncService.create(
			'releases',
			'song',
			updatedSong!.uuid,
			{
				...aux,
				maxPrice: Math.max(
					populatedSong.pricing.digital,
					populatedSong.pricing.cd,
					populatedSong.pricing.cassette,
					populatedSong.pricing.vinyl,
				),
				minPrice: Math.min(
					populatedSong.pricing.digital,
					populatedSong.pricing.cd,
					populatedSong.pricing.cassette,
					populatedSong.pricing.vinyl,
				),
			},
		);

		return populatedSong;
	}

	async addFormat(uuid: string, format: SongFormats) {
		const song = await this.songModel.findOne({ uuid });
		if (!song) throw new NotFoundException();
		song.formats.push(format);
		await song.save();
	}

	async deleteByUuid(uuid: string): Promise<void> {
		await this.elasticsearchSyncService.delete('releases', 'song', uuid);
		await this.songModel.deleteOne({ uuid });
	}

    async incrementPlays(uuid: string): Promise<void> {
        const song = await this.songModel.findOne({uuid})
        if(!song) throw new NotFoundException();
        song.plays++
        await song.save()
    }
}
