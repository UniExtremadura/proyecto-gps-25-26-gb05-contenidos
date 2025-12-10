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
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Roles } from '../../auth/roles.decorator';
import { AuthGuard } from '../../auth/auth.guard';
import { SupabaseUser } from '../../auth/user.decorator';
import { type User as SbUser } from '@supabase/supabase-js';
import { Song } from '../songs/schemas/song.schema';
import { Artist } from '../artists/schemas/artist.schema';

@Controller('products')
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	@Get()
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async getProductsByArtistToken(@SupabaseUser() sbUser: SbUser) {
		return await this.productsService.findByAuthorUuid(sbUser.id);
	}

	@Get(':uuid')
	@HttpCode(HttpStatus.OK)
	async getProductByUuid(@Param('uuid') uuid: string) {
		return await this.productsService.findOneByUuidAndPopulate(uuid);
	}

	@Post()
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async postProduct(
		@Body() createProductDto: CreateProductDto,
		@SupabaseUser() sbUser: SbUser,
	) {
		createProductDto.authorUuid = sbUser.id;
		return await this.productsService.create(createProductDto);
	}

	@Put(':uuid')
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async updateProduct(
		@Param('uuid') uuid: string,
		@Body() updateProductDto: UpdateProductDto,
		@SupabaseUser() sbUser: SbUser,
	) {
		updateProductDto.authorUuid = sbUser.id;
		updateProductDto.uuid = uuid;
		return await this.productsService.update(updateProductDto);
	}

	@Delete(':uuid')
	@Roles(['artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async deleteProduct(
		@Param('uuid') uuid: string,
		@SupabaseUser() sbUser: SbUser,
	) {
		const product = await this.productsService.findOneByUuidAndPopulate(uuid);
		const reference = product.reference as Song;
		if ((reference.author as Artist).uuid !== sbUser.id)
			throw new UnauthorizedException();
		await this.productsService.deleteByUuid(uuid);
	}
}
