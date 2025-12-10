import { Injectable } from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';
import { Notification } from '../schemas/notification.schema';
import { ArtistsService } from '../../modules/artists/artists.service';
import { Types } from 'mongoose';

@Injectable()
export class NotificationService {
	constructor(
		private readonly userService: UsersService,
		private readonly artistService: ArtistsService,
	) {}

	async notifyFollowers(artistUuid: string, notification: Notification) {
		const artist = await this.artistService.findOneByUuid(artistUuid);
        if(artist.followers.length !== 0) {
            await this.userService.addNotification(
                artist.followers as Types.ObjectId[],
                notification,
                artist,
            );
        }
	}
}
