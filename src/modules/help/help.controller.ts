import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common';
import { HelpService } from './help.service';
import { CreateHelpDto } from './dto/create-help.dto';
import { UpdateHelpDto } from './dto/update-help.dto';
import { Help } from './schemas/help.schema';
import { Roles } from '../../auth/roles.decorator';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('help')
export class HelpController {
	constructor(private readonly helpService: HelpService) {}

	@Get()
	async getAllHelps(): Promise<Help[]> {
		return await this.helpService.findAll();
	}

	@Get(':uuid')
	async getHelpByUuid(@Param('uuid') uuid: string): Promise<Help> {
		return await this.helpService.findOneByUuid(uuid);
	}

	@Post()
	@Roles(['admin'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async create(@Body() createHelpDto: CreateHelpDto): Promise<Help> {
		return await this.helpService.create(createHelpDto);
	}

	@Put(':uuid')
	@Roles(['admin'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async update(
		@Param('uuid') uuid: string,
		@Body() updateHelpDto: UpdateHelpDto,
	): Promise<Help> {
		return await this.helpService.update(uuid, updateHelpDto);
	}

	@Delete(':uuid')
	@Roles(['admin'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async delete(@Param('uuid') uuid: string): Promise<void> {
		return await this.helpService.delete(uuid);
	}
}
