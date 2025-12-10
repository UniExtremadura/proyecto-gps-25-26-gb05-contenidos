import {
	ArrayUnique,
	IsArray,
	IsDataURI,
	IsEmpty,
	IsNotEmpty,
	IsString,
	IsUUID,
	ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
	Pricing,
	type PricingType,
} from '../../../common/schemas/pricing.schema';

export class CreateAlbumDto {
	@IsString()
	@IsNotEmpty()
	title: string;

	@IsNotEmpty()
	@Transform(({ value }) => {
		if (typeof value === 'string') {
			const parsed = JSON.parse(value);
			return Object.assign(new Pricing(), parsed);
		} else {
			return value;
		}
	})
	@Type(() => Pricing)
	@ValidateNested()
	pricing: PricingType;

	@IsEmpty()
	author: string;

	@Transform(({ value }) => {
		if (typeof value === 'string') {
			return JSON.parse(value);
		}
		return value;
	})
	@IsArray()
	@ArrayUnique()
	@IsString({ each: true })
	@IsNotEmpty({ each: true })
	songs: string[];
}
