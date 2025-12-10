import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../users/schemas/user.schema';
import { Song } from '../../songs/schemas/song.schema';

export type PlaylistDocument = HydratedDocument<Playlist>;

@Schema({
	versionKey: false,
	toJSON: {
		transform: (doc, ret) => {
			const { _id, ...rest } = ret;
			return rest;
		},
	},
})
export class Playlist {
	_id: Types.ObjectId;

	@Prop({ default: () => uuidv4() })
	uuid: string;

	@Prop({ default: '' })
	title: string;

	@Prop({ default: '' })
	description: string;

	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	author: User | Types.ObjectId;

	@Prop({ type: [Types.ObjectId], ref: 'Song', required: true })
	songs: Song[] | Types.ObjectId[];

	@Prop({ required: true })
	duration: number;

	@Prop({ default: '' })
	cover: string;

	@Prop({ default: false })
	public: boolean;
}

export const PlaylistSchema = SchemaFactory.createForClass(Playlist);
