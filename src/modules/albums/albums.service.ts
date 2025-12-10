import {
    forwardRef,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Album } from './schemas/album.schema';
import { Model, Types } from 'mongoose';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { SongsService } from '../songs/songs.service';
import { ArtistsService } from '../artists/artists.service';
import { ElasticsearchSyncService } from '../../common/services/elasticsearch-sync.service';
import { GenresService } from '../genres/genres.service';

@Injectable()
export class AlbumsService {
	constructor(
		@InjectModel(Album.name) private albumModel: Model<Album>,
        @Inject(forwardRef(() => SongsService))
        private readonly songsService: SongsService,
        @Inject(forwardRef(() => ArtistsService))
		private readonly artistsService: ArtistsService,
		private readonly genresService: GenresService,
		private readonly elasticsearchSyncService: ElasticsearchSyncService,
	) {}

	async isAuthor(artistUuid: string, albumUuid: string) {
		const artist = await this.artistsService.findOneByUuid(artistUuid);
		const album = await this.findOneByUuid(albumUuid);
		return artist._id.toString() === album.author._id.toString();
	}

	async findAll(): Promise<Album[]> {
		return this.albumModel.find();
	}

	async findByAuthorUuid(uuid: string): Promise<Album[]> {
		const artist = await this.artistsService.findOneByUuid(uuid);
		return this.albumModel
			.find({ author: artist._id })
			.sort({ releaseDate: -1 })
			.populate(['author', 'genres'])
			.populate({
				path: 'songs',
				populate: [{ path: 'author' }, { path: 'featuring' }, { path: 'genres' }],
			});
	}

	async findOneByUuid(uuid: string): Promise<Album> {
		const album = await this.albumModel.findOne({ uuid });
		if (!album) throw new NotFoundException();
		return album;
	}

	async findOneByIdAndPopulate(id: Types.ObjectId): Promise<Album> {
		const album = await this.albumModel
			.findById(id)
			.populate(['author', 'genres'])
			.populate({
				path: 'songs',
				populate: [{ path: 'author' }, { path: 'featuring' }, { path: 'genres' }],
			});
		if (!album) throw NotFoundException;
		return album;
	}

	async findOneByUuidAndPopulate(uuid: string): Promise<Album> {
		const album = await this.albumModel
			.findOne({ uuid })
			.populate(['author', 'genres'])
			.populate({
				path: 'songs',
				populate: [{ path: 'author' }, { path: 'featuring' }, { path: 'genres' }],
			});
		if (!album) throw NotFoundException;
		return album;
	}

	async create(createAlbumDto: CreateAlbumDto): Promise<Album> {
		let duration = 0;
		const songIds: Types.ObjectId[] = [];
		const genreIds: Types.ObjectId[] = [];
		const author = await this.artistsService.findOneByUuid(createAlbumDto.author);

		for (const songUuid of createAlbumDto.songs) {
			const song = await this.songsService.findOneByUuid(songUuid);

			if (!(await this.songsService.isAuthor(createAlbumDto.author, songUuid))) {
				throw new UnauthorizedException();
			}

			for (const genreId of song.genres) {
				if (!genreIds.some(g => g.toString() === genreId.toString())) {
					genreIds.push(genreId as Types.ObjectId);
				}
			}

			duration += song.duration;
			songIds.push(song._id);
		}

		try {
			const createdAlbum = new this.albumModel({
				...createAlbumDto,
				author: author._id,
				songs: songIds,
				genres: genreIds,
				duration: Math.round(duration),
			});
			createdAlbum.cover = `${process.env.APP_BASE_URL}/static/public/album-covers/${createdAlbum.uuid}`;

			const album = await createdAlbum.save();
			const populatedAlbum = await this.findOneByUuidAndPopulate(album.uuid);
			const aux: any = (populatedAlbum as any).toObject();
			delete aux._id;
			await this.elasticsearchSyncService.create(
				'releases',
				'album',
				createdAlbum.uuid,
				{
					...aux,
					maxPrice: Math.max(
						populatedAlbum.pricing.digital,
						populatedAlbum.pricing.cd,
						populatedAlbum.pricing.cassette,
						populatedAlbum.pricing.vinyl,
					),
					minPrice: Math.min(
						populatedAlbum.pricing.digital,
						populatedAlbum.pricing.cd,
						populatedAlbum.pricing.cassette,
						populatedAlbum.pricing.vinyl,
					),
				},
			);
			return populatedAlbum;
		} catch (error) {
			throw new InternalServerErrorException();
		}
	}

	async update(uuid: string, updateAlbumDto: UpdateAlbumDto): Promise<Album> {
		const album = await this.findOneByUuid(uuid);
		const songIds: Types.ObjectId[] = [];
		const genreIds: Types.ObjectId[] = [];
		console.log(updateAlbumDto);

		if (!(await this.isAuthor(updateAlbumDto.author!, uuid))) {
			throw new UnauthorizedException();
		}

		if (updateAlbumDto.songs) {
			for (const songUuid of updateAlbumDto.songs) {
				const isAuthor = this.songsService.isAuthor(
					updateAlbumDto.author!,
					songUuid,
				);
				if (!isAuthor) throw new UnauthorizedException();

				const song = await this.songsService.findOneByUuid(songUuid);
				songIds.push(song._id);

				for (const genreId of song.genres) {
					if (!genreIds.includes(genreId as Types.ObjectId)) {
						genreIds.push(genreId as Types.ObjectId);
					}
				}
			}
		}

		const updatedAlbum = await this.albumModel.findOneAndUpdate(
			{ uuid },
			{
				...updateAlbumDto,
				author: album.author,
				songs: updateAlbumDto.songs ? songIds : album.songs,
				genres: updateAlbumDto.songs ? genreIds : album.genres,
			},
			{ new: true }
		);

		const populatedAlbum = await this.findOneByUuidAndPopulate(
			updatedAlbum!.uuid,
		);
		const aux: any = (populatedAlbum as any).toObject();
		delete aux._id;

		await this.elasticsearchSyncService.create(
			'releases',
			'album',
			updatedAlbum!.uuid,
			{
				...aux,
				maxPrice: Math.max(
					populatedAlbum.pricing.digital,
					populatedAlbum.pricing.cd,
					populatedAlbum.pricing.cassette,
					populatedAlbum.pricing.vinyl,
				),
				minPrice: Math.min(
					populatedAlbum.pricing.digital,
					populatedAlbum.pricing.cd,
					populatedAlbum.pricing.cassette,
					populatedAlbum.pricing.vinyl,
				),
			},
		);

		return populatedAlbum;
	}

	async deleteByUuid(uuid: string): Promise<void> {
		await this.elasticsearchSyncService.delete('releases', 'album', uuid);
		await this.albumModel.findOneAndDelete({ uuid });
	}
}
