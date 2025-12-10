import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Song } from '../../songs/schemas/song.schema';
import { Album } from '../../albums/schemas/album.schema';
import { User } from '../../users/schemas/user.schema';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({
	versionKey: false,
	toJSON: {
		transform: (doc, ret) => {
			const { _id, ...rest } = ret;
			return rest;
		},
	},
})
export class Review {
	_id: Types.ObjectId;

	@Prop({ default: () => uuidv4() })
	uuid: string;

	@Prop({ type: String, required: true })
	productType: 'Song' | 'Album';

	@Prop({ type: Types.ObjectId, refPath: 'productType', required: true })
	product: Song | Album | Types.ObjectId;

	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	user: User | Types.ObjectId;

	@Prop({ required: true, min: 0, max: 5 })
	rating: number;

	@Prop()
	title?: string;

	@Prop()
	content?: string;

	@Prop({ default: Date.now() })
	date: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
