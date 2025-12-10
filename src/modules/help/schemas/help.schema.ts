import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum HelpCategory {
	CANCIONES = 'canciones',
	ALBUMES = 'albumes',
	MERCHANDISING = 'merchandising',
	COMPRAS = 'compras',
	USUARIOS = 'usuarios',
	ESTADISTICAS = 'estadisticas',
	COMENTARIOS = 'commentarios',
}

export type HelpDocument = HydratedDocument<Help>;

@Schema({
	versionKey: false,
	toJSON: {
		transform: (doc, ret) => {
			const { _id, ...rest } = ret;
			return rest;
		},
	},
})
export class Help {
	_id: Types.ObjectId;

	@Prop({ default: () => uuidv4() })
	uuid: string;

	@Prop({ required: true })
	title: string;

	@Prop({ required: true, enum: HelpCategory })
	category: HelpCategory;

	@Prop({ default: Date.now() })
	date: Date;

	@Prop({ required: true })
	content: string;
}

export const HelpSchema = SchemaFactory.createForClass(Help);
