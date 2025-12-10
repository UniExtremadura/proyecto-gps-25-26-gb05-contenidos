import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Playlist } from './schemas/playlist.schema';
import { Model, Types } from 'mongoose';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { SongsService } from '../songs/songs.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PlaylistsService {
	constructor(
		@InjectModel(Playlist.name) private playlistModel: Model<Playlist>,
		private readonly songsService: SongsService,
		private readonly userService: UsersService,
	) {}

	async isAuthor(userUuid: string, playlistUuid: string) {
		const user = await this.userService.findOneByUuid(userUuid);
		const playlist = await this.findOneByUuid(playlistUuid);
		return playlist.author._id.toString() === user._id.toString();
	}

	async findAll(): Promise<Playlist[]> {
		return this.playlistModel.find();
	}

	async findOneByUuid(uuid: string): Promise<Playlist> {
		const playlist = await this.playlistModel.findOne({ uuid });
		if (!playlist) throw new NotFoundException();
		return playlist;
	}

	async findOneByUuidAndPopulate(uuid: string): Promise<Playlist> {
		const playlist = await this.playlistModel
			.findOne({ uuid })
			.populate('author')
			.populate('songs');
		if (!playlist) throw NotFoundException;
		return playlist;
	}

	async create(createPlaylistDto: CreatePlaylistDto): Promise<Playlist> {
		let duration = 0;
		const songsIds: Types.ObjectId[] = [];
		const covers: string[] = [];
		const author = await this.userService.findOneByUuid(createPlaylistDto.author);

		for (const songUuid of createPlaylistDto.songs) {
			const song = await this.songsService.findOneByUuid(songUuid);
			covers.push(song.cover);
			duration = duration + song.duration;
			songsIds.push(song._id);
		}

		try {
			const createdPlaylist = new this.playlistModel({
				...createPlaylistDto,
				author: author._id,
				songs: songsIds,
				duration,
			});

			createdPlaylist.cover = `${covers[0]}`;

			const playlist = await createdPlaylist.save();

			return await this.findOneByUuidAndPopulate(playlist.uuid);
		} catch (error) {
			throw new InternalServerErrorException();
		}
	}

	async update(
		userUuid: string,
		playlistUuid: string,
		updatePlaylistDto: UpdatePlaylistDto,
	): Promise<Playlist> {
		const playlist = await this.findOneByUuid(playlistUuid);
		const songIds: Types.ObjectId[] = [];
		let duration: number = 0;
		const covers: string[] = [];

		if (!(await this.isAuthor(userUuid, playlistUuid))) {
			throw new UnauthorizedException();
		}
		const author = await this.userService.findOneByUuid(userUuid);

		if (updatePlaylistDto.songs) {
			for (const songUuid of updatePlaylistDto.songs) {
				const song = await this.songsService.findOneByUuid(songUuid);
				songIds.push(song._id);
				covers.push(song.cover);
				duration = duration + song.duration;
			}
		}

		const updatedPlaylist = await this.playlistModel.findOneAndUpdate(
			{ uuid: playlistUuid },
			{
				...updatePlaylistDto,
				cover: covers[0],
				author: author._id,
				songs: songIds,
				duration: duration,
			},
		);

		return await this.findOneByUuidAndPopulate(updatedPlaylist!.uuid);
	}

	async delete(uuid: string): Promise<void> {
		await this.playlistModel.deleteOne({ uuid });
	}
}
