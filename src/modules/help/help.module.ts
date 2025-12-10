import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Help, HelpSchema } from './schemas/help.schema';
import { HelpService } from './help.service';
import { HelpController } from './help.controller';
import { HttpModule } from '@nestjs/axios';
import { ServiceTokenProvider } from '../../common/providers/service-token.provider';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Help.name, schema: HelpSchema }]),
		CacheModule.register(),
		HttpModule,
	],
	controllers: [HelpController],
	providers: [HelpService, ServiceTokenProvider],
	exports: [HelpService],
})
export class HelpModule {}
