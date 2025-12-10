import { IsDecimal, IsNotEmpty, IsNumber } from 'class-validator';

export type PricingType = {
	cd: number;
	vinyl: number;
	cassette: number;
	digital: number;
};

export class Pricing implements PricingType {
	@IsNotEmpty()
	@IsNumber({ maxDecimalPlaces: 0 })
	cd: number;

	@IsNotEmpty()
	@IsNumber({ maxDecimalPlaces: 0 })
	vinyl: number;

	@IsNotEmpty()
	@IsNumber({ maxDecimalPlaces: 0 })
	cassette: number;

	@IsNotEmpty()
	@IsNumber({ maxDecimalPlaces: 0 })
	digital: number;
}

export const PricingSchema = {
	cd: { type: Number, required: true, min: 0 },
	vinyl: { type: Number, required: true, min: 0 },
	cassette: { type: Number, required: true, min: 0 },
	digital: { type: Number, required: true, min: 0 },
};
