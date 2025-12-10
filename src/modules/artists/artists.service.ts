import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Artist } from './schemas/artist.schema';
import { Model, Types } from 'mongoose';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { UsersService } from "../users/users.service";

@Injectable()
export class ArtistsService {
	constructor(
        @InjectModel(Artist.name) private artistModel: Model<Artist>,
        private readonly usersService: UsersService,
    ) {}

    async findAll(): Promise<Artist[]> {
        return await this.artistModel.find().exec();
    }

    async create(createArtistDto: CreateArtistDto): Promise<Artist> {
		const artist = new this.artistModel(createArtistDto);
		return await artist.save();
	}

	async findOneById(id: string): Promise<Artist> {
		const artist = await this.artistModel.findById(id);
		if (!artist) throw new NotFoundException();
		return artist;
	}

	async findOneByUuid(uuid: string): Promise<Artist> {
		const artist = await this.artistModel.findOne({ uuid });
		if (!artist) throw new NotFoundException();
		return artist;
	}

    async findOneByUuidAndPopulate(uuid: string) {
        const artist = await this.artistModel
            .findOne({ uuid })
            .populate(['followers']);
        if (!artist) throw new NotFoundException();

        return {
            uuid: artist.uuid,
            artistName: artist.artistName,
            profileImg: artist.profileImg,
            bannerImg: artist.bannerImg,
            biography: artist.biography,
            followers: artist.followers,
        };
    }

    async update(uuid: string, userLoggedUuid: string, updateArtistDto: UpdateArtistDto): Promise<Artist> {

        if (uuid != userLoggedUuid) {
            throw new UnauthorizedException();
        }

        if ('profileImg' in updateArtistDto) {
            updateArtistDto.profileImg = `${process.env.APP_BASE_URL}/static/public/artist-profiles/${uuid}`;
        }
        if ('bannerImg' in updateArtistDto) {
            updateArtistDto.bannerImg = `${process.env.APP_BASE_URL}/static/public/artist-banners/${uuid}`;
        }

        const updatedArtist = await this.artistModel.findOneAndUpdate(
            { uuid },
            { $set: updateArtistDto },
            { new: true },
        );

        if (!updatedArtist) throw new NotFoundException();

        return updatedArtist!;
    }

	async delete(uuid: string) {
		await this.artistModel.deleteOne({ uuid });
	}

    /* Lógica de seguidores */
    async followArtist(uuid: string, userId: string) {
        // Encontrar al artista
        const artist = await this.artistModel.findOne({ uuid });
        if (!artist) throw new NotFoundException('Artista no encontrado');

        // Encontrar al user
        const user = await this.usersService.findOneByUuid(userId);
        if (!user) throw new NotFoundException('Usuario no encontrado en Mongo');

        // Evitar duplicados
        if (artist.followers.some(f => f.toString() === user._id.toString())) {
            throw new BadRequestException('Ya sigues a este artista');
        }

        // Guardar ObjectId del usuario
        artist.followers.push(user._id);

		await this.usersService.follow(user._id, artist._id);

        return artist.save();
    }

    async unfollowArtist(uuid: string, userId: string) {

        const artist = await this.artistModel.findOne({ uuid });
        if (!artist) throw new NotFoundException('Artista no encontrado');

        const user = await this.usersService.findOneByUuid(userId);
        if (!user) throw new NotFoundException('Usuario no encontrado');

        artist.followers = artist.followers.filter(
            f => f.toString() !== user._id.toString()
        );

		await this.usersService.unfollow(user._id, artist._id);

        return artist.save();

    }

    async isFollowingArtist(uuid: string, userId: string): Promise<boolean> {

        const user = await this.usersService.findOneByUuid(userId);
        if (!user) return false;

        const artist = await this.artistModel.findOne({
            uuid,
            followers: user._id,
        });

        return !!artist;
    }
}
