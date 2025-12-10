import {
	forwardRef, Inject,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Model, Types } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SongsService } from '../songs/songs.service';
import { AlbumsService } from '../albums/albums.service';
import { Artist } from '../artists/schemas/artist.schema';
import { UpdateProductDto } from './dto/update-product.dto';
import {ArtistsService} from "../artists/artists.service";

@Injectable()
export class ProductsService {
	constructor(
		@InjectModel(Product.name) private productModel: Model<Product>,
		@InjectQueue('productPreview') private productPreviewQueue: Queue,
		@Inject(forwardRef(() => SongsService))
		private readonly songsService: SongsService,
		private readonly albumsService: AlbumsService,
		@Inject(forwardRef(() => ArtistsService))
        private readonly artistsService: ArtistsService,
	) {}

	async findAll(): Promise<Product[]> {
		return this.productModel.find();
	}

	async findOneByUuid(uuid: string): Promise<Product> {
		const product = await this.productModel.findOne({ uuid });
		if (!product) throw new NotFoundException();
		return product;
	}

	async findOneByIdAndPopulate(id: Types.ObjectId): Promise<Product> {
		let product = await this.productModel.findById(id);
		if (!product) throw new NotFoundException();

		if (product.referenceType === 'song') {
			product = await product.populate({
				path: 'reference',
				populate: [{ path: 'author' }, { path: 'genres' }, { path: 'featuring' }],
			});
		} else if (product.referenceType === 'album') {
			product = await product.populate({
				path: 'reference',
				populate: [
					{ path: 'author' },
					{ path: 'genres' },
					{
						path: 'songs',
						populate: [{ path: 'author' }, { path: 'featuring' }, { path: 'genres' }],
					},
				],
			});
		}

		return product;
	}

	async findOneByUuidAndPopulate(uuid: string): Promise<Product> {
		let product = await this.productModel.findOne({ uuid });
		if (!product) throw new NotFoundException();

		if (product.referenceType === 'song') {
			product = await product.populate({
				path: 'reference',
				populate: [{ path: 'author' }, { path: 'genres' }, { path: 'featuring' }],
			});
		} else if (product.referenceType === 'album') {
			product = await product.populate({
				path: 'reference',
				populate: [
					{ path: 'author' },
					{ path: 'genres' },
					{
						path: 'songs',
						populate: [{ path: 'author' }, { path: 'featuring' }, { path: 'genres' }],
					},
				],
			});
		}

		return product;
	}

    async findByAuthorUuid(authorUuid: string): Promise<Product[]> {
        const artist = await this.artistsService.findOneByUuid(authorUuid);
        return this.productModel
            .find()
            .populate({
                path: 'reference',
                match: { author: artist._id },
            })
            .then(products => products.filter(p => p.reference));
    }

	async create(createProductDto: CreateProductDto): Promise<Product> {
		let reference: Types.ObjectId = new Types.ObjectId();

		if (createProductDto.referenceType === 'song') {
			const song = await this.songsService.findOneByUuidAndPopulate(
				createProductDto.reference,
			);
			if ((song.author as Artist).uuid !== createProductDto.authorUuid)
				throw new UnauthorizedException();
			reference = song._id;
		} else if (createProductDto.referenceType === 'album') {
			const album = await this.albumsService.findOneByUuidAndPopulate(
				createProductDto.reference,
			);
			if ((album.author as Artist).uuid !== createProductDto.authorUuid)
				throw new UnauthorizedException();
			reference = album._id;
		}

		const type = createProductDto.referenceType;

		let product = await this.productModel.create({
			...createProductDto,
			refPath: type.at(0)!.toUpperCase() + type.slice(1),
			reference,
		});
		product = await product.save();

		this.productPreviewQueue.add('productPreview', {
			referenceType: createProductDto.referenceType,
			referenceUuid: createProductDto.reference,
			productUuid: product.uuid,
			type: createProductDto.type,
		});

		return await this.findOneByUuidAndPopulate(product.uuid);
	}

	async addPreview(uuid: string, preview: string): Promise<Product> {
		const product = await this.findOneByUuid(uuid);
		if (!product) throw new NotFoundException();
		product.previews.push(preview);
		const updatedProduct = await this.productModel.findByIdAndUpdate(
			product._id,
			product,
			{ new: true },
		);
		return updatedProduct!;
	}

	async update(updateProductDto: UpdateProductDto): Promise<Product> {
		const product = await this.findOneByUuidAndPopulate(updateProductDto.uuid);
		const updatedProduct = await this.productModel.findByIdAndUpdate(
			product._id,
			updateProductDto,
			{ new: true },
		);
		return updatedProduct!;
	}

	async deleteByUuid(uuid: string): Promise<void> {
		await this.productModel.deleteOne({ uuid });
	}
}
