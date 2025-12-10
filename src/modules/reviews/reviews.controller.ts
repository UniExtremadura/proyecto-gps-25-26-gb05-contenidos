import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './schemas/review.schema';
import { Roles } from '../../auth/roles.decorator';
import { AuthGuard } from '../../auth/auth.guard';
import { type User as SbUser } from '@supabase/supabase-js';
import { SupabaseUser } from '../../auth/user.decorator';

@Controller('reviews')
export class ReviewsController {
	constructor(private readonly reviewsService: ReviewsService) {}

	@Get()
	async getAllReviews(): Promise<Review[]> {
		return await this.reviewsService.findAll();
	}

	@Get(':uuid')
	async getReviewByUuid(@Param('uuid') uuid: string): Promise<Review> {
		return await this.reviewsService.findOneByUuidAndPopulate(uuid);
	}

	@Get('product/:productUuid')
	async getReviewsByProductUuid(
		@Param('productUuid') productUuid: string,
	): Promise<Review[]> {
		return await this.reviewsService.findByProductUuid(productUuid);
	}

	@Post()
	@Roles(['user', 'artist'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async create(
		@Body() createReviewDto: CreateReviewDto,
		@SupabaseUser() sbUser: SbUser,
	): Promise<Review> {
		const review = await this.reviewsService.create({
			...createReviewDto,
			user: sbUser.id,
		});

		return review;
	}

	@Delete(':uuid')
	@Roles(['admin'])
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async delete(@Param('uuid') uuid: string): Promise<void> {
		return await this.reviewsService.delete(uuid);
	}
}
