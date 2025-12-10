import { IsEmpty, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateReviewDto {
	@IsNotEmpty()
	@IsString()
	productType: 'Song' | 'Album';

	@IsNotEmpty()
	@IsString()
	product: string;

	@IsEmpty()
	user: string;

	@IsNumber()
	@IsNotEmpty()
	rating: number;

	@IsString()
	title: string;

	@IsString()
	content: string;

	@IsEmpty()
	date: Date;
}
