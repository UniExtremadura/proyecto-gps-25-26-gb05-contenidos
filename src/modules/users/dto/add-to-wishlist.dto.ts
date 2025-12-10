import {IsIn, IsNotEmpty, IsUUID} from "class-validator";

export class AddToWishlistDto {
	@IsNotEmpty()
	@IsUUID()
	uuid: string;

	@IsNotEmpty()
	@IsIn(['song', 'album', 'merch'])
	type: string;
}