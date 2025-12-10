import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
	@IsOptional()
	@IsString()
	title: string;

	@IsOptional()
	@IsString()
	description: string;

	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 0 })
	price: number;

	uuid: string;
	authorUuid: string;
}
