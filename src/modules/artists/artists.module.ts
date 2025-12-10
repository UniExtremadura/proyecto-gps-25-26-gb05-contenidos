import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Artist, ArtistSchema } from './schemas/artist.schema';
import { ArtistsService } from './artists.service';
import { ArtistsController } from './artists.controller';
import { HttpModule } from '@nestjs/axios';
import { ServiceTokenProvider } from '../../common/providers/service-token.provider';
import { CacheModule } from '@nestjs/cache-manager';
import { SongsModule } from "../songs/songs.module";
import { AlbumsModule } from "../albums/albums.module";
import { ProductsModule } from "../products/products.module";
import { UsersModule } from "../users/users.module";
import { BucketService } from "../../common/services/bucket.service";

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Artist.name, schema: ArtistSchema }]),
		CacheModule.register(),
		HttpModule,
		forwardRef(() => SongsModule),
        forwardRef(() => AlbumsModule),
        forwardRef(() => ProductsModule),
        forwardRef(() => UsersModule),
	],
	controllers: [ArtistsController],
	providers: [
        ArtistsService,
        ServiceTokenProvider,
        BucketService,
    ],
	exports: [ArtistsService],
})
export class ArtistsModule {}
