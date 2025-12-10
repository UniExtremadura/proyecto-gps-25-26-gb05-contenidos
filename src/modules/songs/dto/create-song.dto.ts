import {
	ArrayUnique,
	IsArray,
	IsEmpty,
	IsNotEmpty,
	IsString,
	IsUUID,
	ValidateNested,
} from 'class-validator';
import {
	Pricing,
	type PricingType,
} from '../../../common/schemas/pricing.schema';
import { Transform, Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CreateSongDto {
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
	cover: string;

	@IsEmpty()
	duration: number;

	@Transform(({ value }) => {
		if (typeof value === 'string') {
			return JSON.parse(value);
		}
		return value;
	})
	@IsArray()
	@ArrayUnique()
	@IsString({ each: true })
	featuring: string[];

	@Transform(({ value }) => {
		if (typeof value === 'string') {
			return JSON.parse(value);
		}
		return value;
	})
	@IsArray()
	@ArrayUnique()
	@IsString({ each: true })
	genres: string[];

	@IsEmpty()
	author: string;
}
