import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Playlist, PlaylistSchema } from './schemas/playlist.schema';
import { PlaylistsService } from './playlists.service';
import { PlaylistsController } from './playlists.controller';
import { SongsModule } from '../songs/songs.module';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from '../users/users.module';
import { ServiceTokenProvider } from '../../common/providers/service-token.provider';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Playlist.name, schema: PlaylistSchema }]),
		CacheModule.register(),
		SongsModule,
		HttpModule,
		UsersModule,
	],
	controllers: [PlaylistsController],
	providers: [PlaylistsService, ServiceTokenProvider],
	exports: [PlaylistsService],
})
export class PlaylistsModule {}
