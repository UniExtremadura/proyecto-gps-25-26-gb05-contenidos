import {
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsEmpty,
	IsNotEmpty,
	IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePlaylistDto {
	@IsString()
	@IsNotEmpty()
	title: string;

	@IsString()
	@IsNotEmpty()
	description: string;

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

	@IsBoolean()
	@IsNotEmpty()
	@Transform(({ value }) => value === 'true')
	public: boolean;
}
