import {
	ArrayNotEmpty,
	IsArray,
	IsIn,
	IsNotEmpty,
	IsUUID,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class LibraryItemDto {
	@IsNotEmpty()
	@IsIn(['song', 'album'])
	type: 'song' | 'album';

	@IsNotEmpty()
	@IsUUID()
	uuid: string;
}

export class UpdateLibraryDto {
	@IsNotEmpty()
	@IsArray()
	@ArrayNotEmpty()
	@Type(() => LibraryItemDto)
	@ValidateNested({ each: true })
	items: LibraryItemDto[];
}
