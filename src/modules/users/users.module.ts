import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { HttpModule } from '@nestjs/axios';
import { ServiceTokenProvider } from '../../common/providers/service-token.provider';
import { SongsModule } from '../songs/songs.module';
import { AlbumsModule } from '../albums/albums.module';
import { CacheModule } from '@nestjs/cache-manager';
import {ProductsModule} from "../products/products.module";

@Module({
	imports: [
		MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
		CacheModule.register(),
		HttpModule,
		forwardRef(() => SongsModule),
		forwardRef(() => AlbumsModule),
		forwardRef(() => ProductsModule),
	],
	controllers: [UsersController],
	providers: [UsersService, ServiceTokenProvider],
	exports: [UsersService],
})
export class UsersModule {}
