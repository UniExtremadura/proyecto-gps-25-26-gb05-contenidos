import {forwardRef, Module} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { BullModule } from '@nestjs/bullmq';
import { ProductPreviewConsumer } from './consumers/product-preview.consumer';
import { HttpModule } from '@nestjs/axios';
import { ServiceTokenProvider } from '../../common/providers/service-token.provider';
import { BucketService } from '../../common/services/bucket.service';
import { SongsModule } from '../songs/songs.module';
import { AlbumsModule } from '../albums/albums.module';
import { CacheModule } from '@nestjs/cache-manager';
import {ArtistsModule} from "../artists/artists.module";

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
		CacheModule.register(),
		BullModule.registerQueue({
			name: 'productPreview',
		}),
		HttpModule,
        forwardRef(() => ArtistsModule),
		forwardRef(() => SongsModule),
		forwardRef(() => AlbumsModule),
	],
	controllers: [ProductsController],
	providers: [
		BucketService,
		ProductsService,
		ProductPreviewConsumer,
		ServiceTokenProvider,
	],
    exports: [ProductsService]
})
export class ProductsModule {}
