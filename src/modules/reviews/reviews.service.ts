import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Review } from './schemas/review.schema';
import { Model } from 'mongoose';
import { CreateReviewDto } from './dto/create-review.dto';
import { SongsService } from '../songs/songs.service';
import { AlbumsService } from '../albums/albums.service';
import { UsersService } from '../users/users.service';
import { Song } from '../songs/schemas/song.schema';
import { Album } from '../albums/schemas/album.schema';

@Injectable()
export class ReviewsService {
	constructor(
		@InjectModel(Review.name) private reviewModel: Model<Review>,
		private readonly songsService: SongsService,
		private readonly albumsService: AlbumsService,
		private readonly usersService: UsersService,
	) {}

	async findAll(): Promise<Review[]> {
		return await this.reviewModel.find().exec();
	}

	async findOneByUuid(uuid: string): Promise<Review> {
		const review = await this.reviewModel.findOne({ uuid });
		if (!review) throw new NotFoundException();
		return review;
	}

	async findOneByUuidAndPopulate(uuid: string): Promise<Review> {
		const review = await this.reviewModel
			.findOne({ uuid })
			.populate(['product', 'user']);
		if (!review) throw new NotFoundException();
		return review;
	}

	async findByProductUuid(productUuid: string): Promise<Review[]> {
		// Buscar si es una canción
		let product: Song | Album =
			await this.songsService.findOneByUuid(productUuid);

		// Si no existe, buscar en Albums
		if (!product) {
			product = await this.albumsService.findOneByUuid(productUuid);
		}

		const reviews = await this.reviewModel
			.find({ product: product._id })
			.populate(['product', 'user']);
		return reviews;
	}

	async create(createReviewDto: CreateReviewDto): Promise<Review> {
		// Buscar si es una canción
		let product: Song | Album = await this.songsService.findOneByUuid(
			createReviewDto.product,
		);

		// Si no existe, buscar en Albums
		if (!product) {
			product = await this.albumsService.findOneByUuid(createReviewDto.product);
		}

		const user = await this.usersService.findOneByUuid(createReviewDto.user);

		const newReview = new this.reviewModel({
			...createReviewDto,
			product: product._id,
			user: user._id,
		});

		try {
			const review = await newReview.save();
			const populatedReview = await this.findOneByUuidAndPopulate(review.uuid);
			return populatedReview;
		} catch (error) {
			throw new InternalServerErrorException('Error creating review');
		}
	}

	async delete(uuid: string): Promise<void> {
		await this.reviewModel.deleteOne({ uuid });
	}
}
