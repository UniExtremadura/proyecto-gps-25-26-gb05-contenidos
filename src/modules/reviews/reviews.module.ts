import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './schemas/review.schema';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { HttpModule } from '@nestjs/axios';
import { ServiceTokenProvider } from '../../common/providers/service-token.provider';
import { SongsModule } from '../songs/songs.module';
import { AlbumsModule } from '../albums/albums.module';
import { UsersModule } from '../users/users.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
		CacheModule.register(),
		HttpModule,
		SongsModule,
		AlbumsModule,
		UsersModule,
	],
	controllers: [ReviewsController],
	providers: [ReviewsService, ServiceTokenProvider],
	exports: [ReviewsService],
})
export class ReviewsModule {}
