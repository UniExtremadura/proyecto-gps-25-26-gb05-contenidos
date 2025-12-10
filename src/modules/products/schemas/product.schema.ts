import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Album } from '../../albums/schemas/album.schema';
import { Song } from '../../songs/schemas/song.schema';

export type ProductDocument = HydratedDocument<Product>;

export enum ProductType {
	TSHIRT = 'tshirt',
	HOODIE = 'hoodie',
	CAP = 'cap',
	POSTER = 'poster',
	TOTEBAG = 'totebag',
	STICKERS = 'stickers',
	PHONECASE = 'phonecase',
	BRACELET = 'bracelet',
	MUG = 'mug',
}

@Schema({
	versionKey: false,
	toJSON: {
		transform: (doc, ret) => {
			// @ts-ignore
			const { _id, refPath, ...rest } = ret;
			return rest;
		},
	},
})
export class Product {
	_id: Types.ObjectId;

	@Prop({ default: () => uuidv4() })
	uuid: string;

	@Prop({ required: true })
	type: ProductType;

	@Prop({ required: true })
	title: string;

	@Prop({ required: true })
	description: string;

	@Prop({ required: true })
	price: number;

	@Prop({ required: true, type: Types.ObjectId, refPath: 'refPath' })
	reference: Types.ObjectId | Song | Album;

	@Prop({ required: true, enum: ['Song', 'Album'] })
	refPath: 'Song' | 'Album';

	@Prop({ required: true })
	referenceType: 'song' | 'album';

	@Prop({ required: true })
	previews: string[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
