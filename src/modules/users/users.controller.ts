import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../auth/roles.decorator';
import { AuthGuard } from '../../auth/auth.guard';
import { User } from './schemas/user.schema';
import { SupabaseUser } from '../../auth/user.decorator';
import { type User as SbUser } from '@supabase/supabase-js';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { Playlist } from '../playlists/schemas/playlist.schema';
import { Notification } from '../../common/schemas/notification.schema';
import {AddToWishlistDto} from "./dto/add-to-wishlist.dto";
import {Artist} from "../artists/schemas/artist.schema";

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getUser(@SupabaseUser() sbUser: SbUser) {
		return await this.usersService.findOneByUuidAndPopulate(sbUser.id);
	}

	@Get('library')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getUserLibrary(@SupabaseUser() sbUser: SbUser) {
		return (await this.usersService.findOneByUuidAndPopulate(sbUser.id)).library;
	}

	@Get('playlists')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getUserPlaylist(@SupabaseUser() sbUser: SbUser) {
		return (await this.usersService.findOneByUuidAndPopulateLibrary(sbUser.id))
			.playlists as Playlist[];
	}

	@Get('following')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getUserFollowing(@SupabaseUser() sbUser: SbUser) {
		return (await this.usersService.findOneByUuidAndPopulateFollowing(sbUser.id))
			.following as Artist[];
	}

	@Delete('notifications/:uuid')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async deleteUserNotification(
		@SupabaseUser() sbUser: SbUser,
		@Param('uuid') uuid: string,
	) {
		return await this.usersService.deleteNotification(sbUser.id, uuid);
	}

	@Get('notifications')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getUserNotifications(@SupabaseUser() sbUser: SbUser) {
		return (
			await this.usersService.findOneByUuidAndPopulateNotifications(sbUser.id)
		).notifications as Notification[];
	}

	@Get('wishlist')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getWishlist(@SupabaseUser() sbUser: SbUser) {
		return await this.usersService.getWishlist(sbUser.id);
	}

	@Put('wishlist')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async addToWishlist(
		@SupabaseUser() sbUser: SbUser,
		@Body() addToWishlistDto: AddToWishlistDto
	) {
		return await this.usersService.addToWishlist(sbUser.id, addToWishlistDto);
	}

	@Delete('wishlist/:uuid')
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async deleteFromWishlist(
		@SupabaseUser() sbUser: SbUser,
		@Param('uuid') uuid: string
	) {
		return await this.usersService.deleteFromWishlist(sbUser.id, uuid);
	}

	@Get(':uuid')
	@HttpCode(HttpStatus.OK)
	async getUserByUuid(@Param('uuid') uuid: string) {
		return await this.usersService.findOneByUuidAndPopulate(uuid);
	}

	@Post()
	@Roles(['admin'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async postUser(@Body() createUserDto: CreateUserDto) {
		return await this.usersService.create(createUserDto);
	}

	@Put(':id')
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async updateUser(
		@Param('id') id: string,
		@Body() updateUserDto: UpdateUserDto,
		@SupabaseUser() sbUser: SbUser,
	): Promise<User> {
		if (sbUser.id !== id) {
			throw new Error('No tienes permiso para modificar este usuario');
		}
		return this.usersService.updateUser(id, updateUserDto);
	}

	@Put(':uuid/library')
	@Roles(['admin'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async updateUserLibrary(
		@Param('uuid') uuid: string,
		@Body() updateLibraryDto: UpdateLibraryDto,
	) {
		return await this.usersService.addToLibrary(uuid, updateLibraryDto);
	}

	@Delete(':uuid')
	@Roles(['admin'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async deleteUserByUuid(@Param('uuid') uuid: string) {
		return await this.usersService.delete(uuid);
	}
}
