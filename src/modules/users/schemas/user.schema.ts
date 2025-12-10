import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Playlist } from '../../playlists/schemas/playlist.schema';
import { Artist } from '../../artists/schemas/artist.schema';
import { Song } from '../../songs/schemas/song.schema';
import { Album } from '../../albums/schemas/album.schema';
import { Notification } from '../../../common/schemas/notification.schema';
import {Product} from "../../products/schemas/product.schema";

export type UserDocument = HydratedDocument<User>;

@Schema({
	_id: false,
	versionKey: false,
	toJSON: {
		transform: (doc, ret) => {
			// @ts-ignore
			ret.type = ret.type === 'Album' ? 'album' : 'song';
			return ret;
		},
	},
})
export class LibraryItem {
	@Prop({ required: true, enum: ['Song', 'Album'] })
	type: string;

	@Prop({ type: Types.ObjectId, required: true, refPath: 'library.type' })
	item: Types.ObjectId | Song | Album;
}
export const LibraryItemSchema = SchemaFactory.createForClass(LibraryItem);

@Schema({
	_id: false,
	versionKey: false,
	toJSON: {
		transform: (doc, ret) => {
			// @ts-ignore
			ret.type = ret.type === 'Album' ? 'album' : ret.type === 'Song' ? 'song' : 'merch';
			return ret;
		},
	},
})
export class WishlistItem {
	@Prop({ required: true, enum: ['Song', 'Album', 'Product'] })
	type: string;

	@Prop({ type: Types.ObjectId, required: true, refPath: 'wishlist.type' })
	item: Types.ObjectId | Song | Album | Product;
}
export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

@Schema({
	versionKey: false,
	toJSON: {
		transform: (doc, ret) => {
			// @ts-ignore
			const { _id, library, playlists, following, wishlist, ...rest } = ret;
			return rest;
		},
	},
})
export class User {
	_id: Types.ObjectId;

	@Prop({ unique: true, required: true })
	uuid: string;

	@Prop({ unique: true, required: true })
	username: string;

	@Prop({
		default: `${process.env.APP_BASE_URL}/static/public/user-profiles/default.jpg`,
	})
	profileImg: string;

	@Prop({ type: [Types.ObjectId], ref: 'Playlist' })
	playlists: Playlist[] | Types.ObjectId[];

	@Prop({ type: [Types.ObjectId], ref: 'Artist' })
	following: Artist[] | Types.ObjectId[];

	@Prop({ type: [LibraryItemSchema] })
	library: LibraryItem[];

	@Prop({ type: [Notification], default:[] })
	notifications: Notification[];

	@Prop({ type: [WishlistItemSchema], default: [] })
	wishlist: WishlistItem[];
}

export const UserSchema = SchemaFactory.createForClass(User);
