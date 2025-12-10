import { ProductType } from '../schemas/product.schema';
import {
	IsEnum,
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsString,
	IsUUID,
} from 'class-validator';

export class CreateProductDto {
	@IsNotEmpty()
	@IsEnum(ProductType)
	type: ProductType;

	@IsNotEmpty()
	@IsString()
	title: string;

	@IsNotEmpty()
	@IsString()
	description: string;

	@IsNotEmpty()
	@IsNumber({ maxDecimalPlaces: 0 })
	price: number;

	@IsNotEmpty()
	@IsUUID()
	reference: string;

	@IsNotEmpty()
	@IsIn(['song', 'album'])
	referenceType: 'song' | 'album';

	authorUuid: string;
}
