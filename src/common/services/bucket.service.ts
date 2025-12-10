import { Injectable, NotFoundException } from '@nestjs/common';
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

@Injectable()
export class BucketService {
	private s3: S3Client;

	constructor() {
		this.s3 = new S3Client({
			region: process.env.BUCKET_REGION!,
			endpoint: process.env.BUCKET_ENDPOINT!,
			forcePathStyle: true,
			credentials: {
				accessKeyId: process.env.BUCKET_ACCESS_KEY!,
				secretAccessKey: process.env.BUCKET_SECRET_KEY!,
			},
		});
	}

	async saveToSongFiles(uuid: string, buffer: Buffer, mimetype: string) {
		const command = new PutObjectCommand({
			Bucket: 'song-files',
			Key: uuid,
			Body: buffer,
			ContentType: mimetype,
		});
		await this.s3.send(command);
	}

	async getFromSongFiles(uuid: string): Promise<Buffer> {
		const command = new GetObjectCommand({
			Bucket: 'song-files',
			Key: uuid,
		});
		const response = await this.s3.send(command);
		if (!response.Body) throw new NotFoundException();
		const chunks: any[] = [];
		for await (const chunk of response.Body as any) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	async getFromSongFilesAsStream(uuid: string): Promise<Readable> {
		const command = new GetObjectCommand({
			Bucket: 'song-files',
			Key: uuid,
		});
		const response = await this.s3.send(command);
		if (!response.Body) throw new NotFoundException();

		return response.Body as Readable;
	}

	async saveToSongCovers(uuid: string, cover: Express.Multer.File) {
		const command = new PutObjectCommand({
			Bucket: 'song-covers',
			Key: uuid,
			Body: cover.buffer,
			ContentType: cover.mimetype,
		});
		await this.s3.send(command);
	}

	async getFromSongCovers(uuid: string): Promise<Buffer> {
		const command = new GetObjectCommand({
			Bucket: 'song-covers',
			Key: uuid,
		});
		const response = await this.s3.send(command);
		if (!response.Body) throw new NotFoundException();
		const chunks: any[] = [];
		for await (const chunk of response.Body as any) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	async saveToAlbumCovers(uuid: string, cover: Express.Multer.File) {
		const command = new PutObjectCommand({
			Bucket: 'album-covers',
			Key: uuid,
			Body: cover.buffer,
			ContentType: cover.mimetype,
		});
		await this.s3.send(command);
	}

	async getFromAlbumCovers(uuid: string): Promise<Buffer> {
		const command = new GetObjectCommand({
			Bucket: 'album-covers',
			Key: uuid,
		});
		const response = await this.s3.send(command);
		if (!response.Body) throw new NotFoundException();
		const chunks: any[] = [];
		for await (const chunk of response.Body as any) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	async saveToProductPreviews(key: string, preview: Buffer) {
		const command = new PutObjectCommand({
			Bucket: 'product-previews',
			Key: key,
			Body: preview,
			ContentType: 'image/jpeg',
		});
		await this.s3.send(command);
	}

	async getFileByUuid(uuid: string) {
		const downloadParams = {
			Bucket: 'song-files',
			Key: uuid,
		};
		const response = await this.s3.send(new GetObjectCommand(downloadParams));
		if (!response.Body) throw new NotFoundException();

		return response.Body;
	}

    async saveToArtistProfiles(uuid: string, img: Express.Multer.File) {
        const command = new PutObjectCommand({
            Bucket: 'artist-profiles',
            Key: uuid,
            Body: img.buffer,
            ContentType: img.mimetype,
        });
        await this.s3.send(command);
    }

    async saveToArtistBanners(uuid: string, img: Express.Multer.File) {
        const command = new PutObjectCommand({
            Bucket: 'artist-banners',
            Key: uuid,
            Body: img.buffer,
            ContentType: img.mimetype,
        });
        await this.s3.send(command);
    }
}
