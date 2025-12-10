import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Song, SongSchema } from './schemas/song.schema';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { HttpModule } from '@nestjs/axios';
import { ServiceTokenProvider } from '../../common/providers/service-token.provider';
import { BucketService } from '../../common/services/bucket.service';
import { ArtistsModule } from '../artists/artists.module';
import { SearchModule } from '../search/search.module';
import { GenresModule } from '../genres/genres.module';
import { BullModule } from '@nestjs/bullmq';
import { SongPreviewConsumer } from './consumers/song-preview.consumer';
import { SongTranscodeConsumer } from './consumers/song-transcode.consumer';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '../users/users.module';
import { NotificationService } from '../../common/services/notification.service';
import { UsersService } from '../users/users.service';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Song.name, schema: SongSchema }]),
		CacheModule.register(),
		BullModule.registerQueue({
			name: 'songPreview',
		}),
		BullModule.registerQueue({
			name: 'songTranscode',
		}),
		HttpModule,
		ArtistsModule,
		SearchModule,
		GenresModule,
		forwardRef(() => UsersModule),
	],
	controllers: [SongsController],
	providers: [
		SongsService,
		ServiceTokenProvider,
		BucketService,
		SongPreviewConsumer,
		SongTranscodeConsumer,
		NotificationService,
	],
	exports: [SongsService],
})
export class SongsModule {}
