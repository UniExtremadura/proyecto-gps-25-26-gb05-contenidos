import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { GenresModule } from './modules/genres/genres.module';
import { SongsModule } from './modules/songs/songs.module';
import { AlbumsModule } from './modules/albums/albums.module';
import { ArtistsModule } from './modules/artists/artists.module';
import { UsersModule } from './modules/users/users.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { ProductsModule } from './modules/products/products.module';
import { SearchModule } from './modules/search/search.module';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { HelpModule } from './modules/help/help.module';
import { ReviewsModule } from './modules/reviews/reviews.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		MongooseModule.forRoot(process.env.MONGODB_HOST || ''),
		BullModule.forRoot({
			connection: {
				host: process.env.BULLMQ_REDIS_HOST,
				port: parseInt(process.env.BULLMQ_REDIS_PORT!),
			},
		}),
		GenresModule,
		SongsModule,
		AlbumsModule,
		ArtistsModule,
		UsersModule,
		PlaylistsModule,
		ProductsModule,
		SearchModule,
		HelpModule,
		ReviewsModule,
	],
})
export class AppModule {}
