import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Artist } from '../../artists/schemas/artist.schema';
import {
	Pricing,
	type PricingType,
} from '../../../common/schemas/pricing.schema';
import { Genre } from '../../genres/schemas/genre.schema';

export type SongDocument = HydratedDocument<Song>;

export enum SongFormats {
	MP3128 = 'mp3-128',
	MP3320 = 'mp3-320',
	AAC = 'aac',
	FLAC = 'flac',
}

@Schema({
	versionKey: false,
	toJSON: {
		transform: (doc, ret) => {
			const { _id, ...rest } = ret;
			return rest;
		},
	},
})
export class Song {
	_id: Types.ObjectId;

	@Prop({ default: () => uuidv4() })
	uuid: string;

	@Prop({ required: true })
	title: string;

	@Prop({ default: Date.now() })
	releaseDate: Date;

	@Prop({ type: Types.ObjectId, ref: 'Artist', required: true })
	author: Artist | Types.ObjectId;

	@Prop({ type: [Types.ObjectId], ref: 'Artist', required: true })
	featuring: Artist[] | Types.ObjectId[];

	@Prop({ type: [Types.ObjectId], ref: 'Genre', required: true, minlength: 1 })
	genres: Genre[] | Types.ObjectId[];

	@Prop({ default: '' })
	cover: string;

	@Prop({ required: true })
	duration: number;

	@Prop({ type: Pricing, required: true })
	pricing: PricingType;

	@Prop({ type: [String], default: [] })
	formats: SongFormats[];

    @Prop({default: 0})
    plays: number;
}

export const SongSchema = SchemaFactory.createForClass(Song);
