import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '@supabase/supabase-js';

export type ArtistDocument = HydratedDocument<Artist>;

@Schema({
    versionKey: false,
    toJSON: {
        transform: (doc, ret) => {
            const { _id, ...rest } = ret;
            return rest;
        },
    },
})
export class Artist {
    _id: Types.ObjectId;

    @Prop({ unique: true, required: true })
    uuid: string;

    @Prop({ default: 'Artista' })
    artistName: string;

    @Prop({
        default: `${process.env.APP_BASE_URL}/static/public/user-profiles/default.jpg`,
    })
    profileImg: string;

    @Prop({
        default: `${process.env.APP_BASE_URL}/static/public/user-profiles/default.jpg`,
    })
    bannerImg: string;

    @Prop({ default: '' })
    biography: string;

    @Prop({ type: [Types.ObjectId], ref: 'User' })
    followers: (User | Types.ObjectId)[];
}

export const ArtistSchema = SchemaFactory.createForClass(Artist);
