import {BadRequestException, forwardRef, Inject, Injectable, NotFoundException} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {User, WishlistItem} from './schemas/user.schema';
import {Model, Promise, Types} from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { SongsService } from '../songs/songs.service';
import { AlbumsService } from '../albums/albums.service';
import { Playlist } from '../playlists/schemas/playlist.schema';
import { Notification } from '../../common/schemas/notification.schema';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ServiceTokenProvider } from '../../common/providers/service-token.provider';
import { transporter } from '../../common/services/mailsending.service';
import { uploadSong } from '../../common/mailTemplates/uploadSong';
import { Artist } from '../artists/schemas/artist.schema';
import { Song } from '../songs/schemas/song.schema';
import { Album } from '../albums/schemas/album.schema';
import { uploadAlbum } from '../../common/mailTemplates/uploadAlbum';
import {AddToWishlistDto} from "./dto/add-to-wishlist.dto";
import {ProductsService} from "../products/products.service";
import {Product} from "../products/schemas/product.schema";

@Injectable()
export class UsersService {
	constructor(
		@InjectModel(User.name) private userModel: Model<User>,
        @Inject(forwardRef(() => SongsService))
		private readonly songsService: SongsService,
		private readonly albumsService: AlbumsService,
		private readonly productsService: ProductsService,
		private httpService: HttpService,
	) {}

	async create(createUserDto: CreateUserDto): Promise<User> {
		const user = new this.userModel(createUserDto);
		return await user.save();
	}

	async findOneByEmail(email: string): Promise<User> {
		const user = await this.userModel.findOne({ email });
		if (!user) throw NotFoundException;
		return user;
	}

	async findOneByUuid(uuid: string): Promise<User> {
		const user = await this.userModel.findOne({ uuid });
		if (!user) throw NotFoundException;
		return user;
	}

	async findOneByUuidAndPopulate(uuid: string): Promise<User> {
		const user = await this.userModel
			.findOne({ uuid })
			.populate('library.item')
			.populate({
				path: 'library.item',
				populate: [{ path: 'genres' }, { path: 'author' }],
			});
		if (!user) throw NotFoundException;
		return user;
	}

	async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
		const user = await this.userModel.findByIdAndUpdate({ id, ...dto });
		if (!user) throw new NotFoundException('User not found');
		return user;
	}

	async addToLibrary(uuid: string, updateLibraryDto: UpdateLibraryDto) {
		const user = await this.findOneByUuid(uuid);
		for (const item of updateLibraryDto.items) {
			if (item.type === 'song') {
				const song = await this.songsService.findOneByUuid(item.uuid);
				user.library.push({
					type: 'Song',
					item: song._id,
				});
			} else if (item.type === 'album') {
				const album = await this.albumsService.findOneByUuid(item.uuid);
				user.library.push({
					type: 'Album',
					item: album._id,
				});
			}
		}
		const updatedUser = await this.userModel.findByIdAndUpdate(user._id, user, {
			new: true,
		});

		return (await this.findOneByUuidAndPopulate(updatedUser!.uuid)).library;
	}

	async delete(uuid: string) {
		await this.userModel.deleteOne({ uuid });
	}

	async addPlaylistToUser(userUuid: string, playlist: Playlist) {
		const uuid = await this.findOneByUuid(userUuid).then((user) => user.uuid);
		const user = await this.userModel.findOne({ uuid });
		if (!user) throw new NotFoundException();

		const playlists = user.playlists as Types.ObjectId[];
		playlists.push(playlist._id);
		await user.save();
	}

	async removePlaylistToUser(sbUser: string, playlist: Playlist) {
		const uuid = await this.findOneByUuid(sbUser).then((user) => user.uuid);
		const user = await this.userModel.findOne({ uuid });

		if (!user) throw new NotFoundException();

		const playlists = user.playlists as Types.ObjectId[];
		user.playlists = playlists.filter(
			(p) => p.toString() !== playlist._id.toString(),
		);
		await user.save();
	}

	async findOneByUuidAndPopulateLibrary(uuid: string) {
		const user = await this.userModel.findOne({ uuid }).populate('playlists');
		if (!user) throw NotFoundException;
		return user;
	}

	async findOneByUuidAndPopulateFollowing(uuid: string) {
		const user = await this.userModel.findOne({ uuid }).populate('following');
		if (!user) throw NotFoundException;
		return user;
	}

	async findOneByUuidAndPopulateNotifications(uuid: string) {
		const user = await this.userModel.findOne({ uuid }).populate({
			path: 'notifications.item',
			populate: [{ path: 'author' }],
		});
		if (!user) throw NotFoundException;
		return user;
	}

	async addNotification(
		ids: Types.ObjectId[],
		notification: Notification,
		artist: Artist,
	) {
		await this.userModel.updateMany(
			{ _id: { $in: ids } },
			{ $push: { notifications: notification } },
		);

		const followers = await this.userModel
			.find({
				_id: { $in: ids },
			})
			.populate('uuid');

		const uuids: string[] = [];
		followers.forEach((item) => uuids.push(item.uuid));

		const populatedNotification = (
			await this.findOneByUuidAndPopulateNotifications(uuids[0])
		).notifications.filter((noti) => noti.uuid === notification.uuid);

		const roleResponse: any = await firstValueFrom(
			this.httpService.post(
				`${process.env.USUARIOS_SERVICE_BASE_URL}/users/bash`,
				{ uuids },
			),
		);

		if (notification.type === 'Song') {
			const song = populatedNotification[0].item as Song;
			for (const user of roleResponse.data as any) {
				transporter.sendMail({
					from: '"Soporte Undersounds" <soporteundersounds@gmail.com>',
					to: user.email,
					subject: `¡${artist.artistName} ha subido una canción!`,
					html: uploadSong(artist.artistName, song.title, song.uuid),
				});
			}
		} else if (notification.type === 'Album') {
			const album = populatedNotification[0].item as Album;
			for (const user of roleResponse.data as any) {
				transporter.sendMail({
					from: '"Soporte Undersounds" <soporteundersounds@gmail.com>',
					to: user.email,
					subject: `¡${artist.artistName} ha subido un nuevo álbum!`,
					html: uploadAlbum(artist.artistName, album.title, album.uuid),
				});
			}
		}
	}

	async deleteNotification(uuid: string, notificationUuid: string) {
		const user = await this.findOneByUuid(uuid);
		await this.userModel.updateOne(
			{ _id: user._id },
			{ $pull: { notifications: { uuid: notificationUuid } } },
		);
	}

	async addToWishlist(uuid: string, addToWishlistDto: AddToWishlistDto) {
		const user = await this.findOneByUuid(uuid);
		let _id: Types.ObjectId;
		let type: 'Song' | 'Album' | 'Product';

		switch (addToWishlistDto.type) {
			case 'song':
				const song = await this.songsService.findOneByUuid(addToWishlistDto.uuid);
				_id = song._id;
				type = 'Song';
				break;
			case 'album':
				const album = await this.albumsService.findOneByUuid(addToWishlistDto.uuid);
				_id = album._id;
				type = 'Album';
				break;
			case 'merch':
				const merch = await this.productsService.findOneByUuid(addToWishlistDto.uuid);
				_id = merch._id;
				type = 'Product';
				break;
		}

		if (user.wishlist.some(item => item.item === _id)) {
			return this.getWishlist(user.uuid);
		}

		await this.userModel.findByIdAndUpdate(user._id, {
			$push: { wishlist: { type: type!, item: _id! } }
		}, { new: true });

		return this.getWishlist(user.uuid);
	}

	async getWishlist(uuid: string) {
		const user = await this.userModel.findOne({ uuid });
		if (!user) throw new NotFoundException();

		const response: WishlistItem[] = [];
		for (const item of user.wishlist) {
			switch (item.type) {
				case 'Song':
					const song = await this.songsService.findOneByIdAndPopulate(item.item as Types.ObjectId);
					response.push({ type: 'song', item: song });
					break;
				case 'Album':
					const album = await this.albumsService.findOneByIdAndPopulate(item.item as Types.ObjectId);
					response.push({ type: 'album', item: album });
					break;
				default:
					const product = await this.productsService.findOneByIdAndPopulate(item.item as Types.ObjectId);
					response.push({ type: 'merch', item: product });
					break;
			}
		}

		return response;
	}

	async deleteFromWishlist(userUuid: string, itemUuid: string) {
		const user = await this.userModel.findOne({ uuid: userUuid });
		if (!user) throw new NotFoundException();

		const userWithWishlist = await user.populate('wishlist.item');
		const newWishlist = userWithWishlist.wishlist.filter(i => (i.item as Song).uuid !== itemUuid);
		await this.userModel.findByIdAndUpdate(user._id, { wishlist: newWishlist });
	}

	async follow(userId: Types.ObjectId, artistId: Types.ObjectId) {
		const user = await this.userModel.findById(userId);
		if (!user) throw new NotFoundException();

		if (user.following.some(item => item.toString() === artistId.toString())) {
			throw new BadRequestException();
		}

		user.following.push(artistId as any);
		await user.save();
	}

	async unfollow(userId: Types.ObjectId, artistId: Types.ObjectId) {
		const user = await this.userModel.findById(userId);
		if (!user) throw new NotFoundException();
		user.following = (user.following.filter(item => item.toString() !== artistId.toString()) as any);
		await user.save();
	}
}
