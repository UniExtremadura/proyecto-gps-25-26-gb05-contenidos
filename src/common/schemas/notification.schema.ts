import { Types } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { Song } from '../../modules/songs/schemas/song.schema';
import { Album } from '../../modules/albums/schemas/album.schema';
import { v4 as uuidv4 } from 'uuid';

@Schema({ _id: false })
export class Notification {
	@Prop({ required: true })
	uuid: string;

	@Prop({ unique: false, required: true, sparse: true, default:""})
	message: string;

	@Prop({ required: false, enum: ['Song', 'Album'] })
	type: string;

	@Prop({ type: Types.ObjectId, required: false, refPath: 'notifications.type' })
	item: Types.ObjectId | Song | Album;
}
