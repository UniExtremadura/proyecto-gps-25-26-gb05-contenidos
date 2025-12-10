import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateArtistDto {
    @IsOptional()
    @IsString()
    artistName?: string;

    @IsOptional()
    @IsUrl()
    profileImg?: string;

    @IsOptional()
    @IsUrl()
    bannerImg?: string;

    @IsOptional()
    @IsString()
    biography?: string;
}
