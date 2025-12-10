import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BucketService } from '../../../common/services/bucket.service';
import * as tmp from 'tmp';
import { InternalServerErrorException } from '@nestjs/common';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';
import * as ffmpegStatic from 'ffmpeg-static';

@Processor('songPreview')
export class SongPreviewConsumer extends WorkerHost {
	constructor(private readonly bucketService: BucketService) {
		super();
	}

	async process(job: Job<any, any, string>): Promise<void> {
		const songFile = await this.bucketService.getFromSongFiles(job.data.uuid);

		const inputFile = tmp.fileSync({ postfix: '.mp3' });
		const outputFile = tmp.fileSync({ postfix: '.mp3' });
		fs.writeFileSync(inputFile.name, songFile);

		const ffmpegArgs = [
			'-i',
			inputFile.name,
			'-t',
			'15',
			'-y',
			'-c:a',
			'libmp3lame',
			'-b:a',
			'128k',
			outputFile.name,
		];

		const ffmpegProcess = spawn(ffmpegStatic.default!, ffmpegArgs);

		ffmpegProcess.on('error', (error) => {
			throw new InternalServerErrorException();
		});

		ffmpegProcess.on('exit', async (code) => {
			if (code === 0) {
				const outputBuffer = fs.readFileSync(outputFile.name);
				await this.bucketService.saveToSongFiles(
					`${job.data.uuid}-preview`,
					outputBuffer,
					'audio/mpeg',
				);

				inputFile.removeCallback();
				outputFile.removeCallback();
			} else {
				throw new InternalServerErrorException();
			}
		});
	}
}
