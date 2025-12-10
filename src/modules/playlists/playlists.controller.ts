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
	Put,
	UnauthorizedException,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { Roles } from '../../auth/roles.decorator';
import { AuthGuard } from '../../auth/auth.guard';
import { SupabaseUser } from '../../auth/user.decorator';
import { type User as SbUser } from '@supabase/supabase-js';
import { Playlist } from './schemas/playlist.schema';
import { UsersService } from '../users/users.service';

@Controller('playlists')
export class PlaylistsController {
	constructor(
		private readonly playlistsService: PlaylistsService,
		private readonly userService: UsersService,
	) {}

	@Post()
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async postPlaylist(
		@Body() createPlalistDto: CreatePlaylistDto,
		@SupabaseUser() sbUser: SbUser,
	): Promise<Playlist> {
		const playlist = await this.playlistsService.create({
			...createPlalistDto,
			author: sbUser.id,
		});

		await this.userService.addPlaylistToUser(sbUser.id, playlist);

		return playlist;
	}

	@Get(':uuid')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getPlaylistById(
		@Param('uuid') uuid: string,
		@SupabaseUser() sbUser: SbUser,
	): Promise<Playlist | null> {
		const playlist = await this.playlistsService.findOneByUuid(uuid);

		if (!playlist) return null;

		if (playlist.public)
			return this.playlistsService.findOneByUuidAndPopulate(playlist.uuid);

		const user = await this.userService.findOneByUuid(sbUser.id);

		const isAuthor =
			playlist.author._id === user._id ||
			playlist.author._id.toString() === user._id.toString();

		return isAuthor
			? this.playlistsService.findOneByUuidAndPopulate(playlist.uuid)
			: null;
	}

	@Put(':uuid')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async updatePlaylistById(
		@Param('uuid') uuid: string,
		@SupabaseUser() sbUser: SbUser,
		@Body() updatedPlaylistDto: UpdatePlaylistDto,
	): Promise<Playlist> {
		return await this.playlistsService.update(
			sbUser.id,
			uuid,
			updatedPlaylistDto,
		);
	}

	@Delete(':uuid')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async deletePlaylistById(
		@Param('uuid') uuid: string,
		@SupabaseUser() sbUser: SbUser,
	) {
		const playlist = await this.playlistsService.findOneByUuid(uuid);
		if (await this.playlistsService.isAuthor(sbUser.id, playlist.uuid)) {
			await this.playlistsService.delete(uuid);
			await this.userService.removePlaylistToUser(sbUser.id, playlist);
		} else {
			throw new UnauthorizedException();
		}
	}
}
