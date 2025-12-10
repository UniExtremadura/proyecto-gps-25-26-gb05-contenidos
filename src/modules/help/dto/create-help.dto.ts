import { IsEmpty, IsNotEmpty, IsString } from 'class-validator';

export class CreateHelpDto {
	@IsString()
	@IsNotEmpty()
	title: string;

	@IsString()
	@IsNotEmpty()
	category: string;

	@IsEmpty()
	date: Date;

	@IsString()
	@IsNotEmpty()
	content: string;
}
