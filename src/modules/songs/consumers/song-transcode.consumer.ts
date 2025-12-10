import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BucketService } from '../../../common/services/bucket.service';
import * as tmp from 'tmp';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import * as ffmpegStatic from 'ffmpeg-static';
import {
	BadRequestException,
	InternalServerErrorException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { SongFormats } from '../schemas/song.schema';
import { SongsService } from '../songs.service';
import {parseBuffer} from "music-metadata";
import {file} from "tmp";
import {Artist} from "../../artists/schemas/artist.schema";

@Processor('songTranscode')
export class SongTranscodeConsumer extends WorkerHost {
	constructor(
		private readonly bucketService: BucketService,
		private readonly songsService: SongsService,
	) {
		super();
	}

	async process(job: Job<any, any, string>): Promise<any> {
		const songFile = await this.bucketService.getFromSongFiles(job.data.uuid);
		const inputFormat = await fileTypeFromBuffer(songFile);
		const outputExt: string = job.data.format.startsWith('mp3')
			? 'mp3'
			: job.data.format;

		const inputFile = tmp.fileSync({ postfix: `.${inputFormat!.ext}` });
		const outputFile = tmp.fileSync({ postfix: `.${outputExt}` });
		fs.writeFileSync(inputFile.name, songFile);

		const ffmpegArgs: string[] = [];
		ffmpegArgs.push('-i', inputFile.name);
		ffmpegArgs.push('-y');
		switch (job.data.format) {
			case SongFormats.FLAC:
				ffmpegArgs.push('-c:a', 'flac');
				break;
			case SongFormats.AAC:
				ffmpegArgs.push('-c:a', 'aac');
				break;
			case SongFormats.MP3128:
				ffmpegArgs.push('-c:a', 'libmp3lame');
				ffmpegArgs.push('-b:a', '128k');
				break;
			case SongFormats.MP3320:
				ffmpegArgs.push('-c:a', 'libmp3lame');
				ffmpegArgs.push('-b:a', '320k');
				break;
			default:
				throw new BadRequestException();
		}
		ffmpegArgs.push(outputFile.name);

		const ffmpegProcess = spawn(ffmpegStatic.default!, ffmpegArgs);

		ffmpegProcess.on('error', (error) => {
			throw new InternalServerErrorException();
		});

		ffmpegProcess.on('exit', async (code) => {
			if (code === 0) {
				const outputBuffer = fs.readFileSync(outputFile.name);
				const outputType = await fileTypeFromBuffer(outputBuffer);
				try {
					if (job.data.format === SongFormats.MP3128) {
						const song = await this.songsService.findOneByUuidAndPopulate(job.data.uuid);
						const fileMetadata = await parseBuffer(outputBuffer, 'audio/mpeg');
						const duration = Math.floor(fileMetadata.format.duration || 0);
						await this.songsService.update(job.data.uuid, { duration, author: (song.author as Artist).uuid });
					}
				} catch (error) {
					console.log(error);
				}

				await this.bucketService.saveToSongFiles(
					`${job.data.uuid}-${job.data.format}`,
					outputBuffer,
					outputType!.mime,
				);
				await this.songsService.addFormat(job.data.uuid, job.data.format);

				inputFile.removeCallback();
				outputFile.removeCallback();
			} else {
				throw new InternalServerErrorException();
			}
		});
	}
}
