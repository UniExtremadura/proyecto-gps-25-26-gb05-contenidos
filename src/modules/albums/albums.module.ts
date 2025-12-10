import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from './schemas/album.schema';
import { AlbumsService } from './albums.service';
import { AlbumsController } from './albums.controller';
import { SongsModule } from '../songs/songs.module';
import { HttpModule } from '@nestjs/axios';
import { ServiceTokenProvider } from '../../common/providers/service-token.provider';
import { BucketService } from '../../common/services/bucket.service';
import { ArtistsModule } from '../artists/artists.module';
import { ElasticsearchSyncService } from '../../common/services/elasticsearch-sync.service';
import { SearchModule } from '../search/search.module';
import { GenresModule } from '../genres/genres.module';
import { CacheModule } from '@nestjs/cache-manager';
import { NotificationService } from '../../common/services/notification.service';
import { UsersModule } from '../users/users.module';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Album.name, schema: AlbumSchema }]),
		CacheModule.register(),
		forwardRef(() => SongsModule),
		HttpModule,
        forwardRef(() => ArtistsModule),
		forwardRef(() => SearchModule),
		GenresModule,
		forwardRef(() => UsersModule),
	],
	controllers: [AlbumsController],
	providers: [
		AlbumsService,
		ServiceTokenProvider,
		BucketService,
		NotificationService,
	],
	exports: [AlbumsService],
})
export class AlbumsModule {}
