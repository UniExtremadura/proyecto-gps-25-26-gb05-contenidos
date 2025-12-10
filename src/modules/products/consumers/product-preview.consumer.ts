import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BucketService } from '../../../common/services/bucket.service';
import { ProductType } from '../schemas/product.schema';
import * as fs from 'node:fs';
import sharp from 'sharp';
import { ProductsService } from '../products.service';

const templateBasePath = './src/modules/products/templates/';
const productPreviewMappings = {
	[ProductType.TSHIRT]: [
		{
			path: `${templateBasePath}/tshirt-1.png`,
			top: 1600,
			left: 1550,
			size: 1000,
		},
		{
			path: `${templateBasePath}/tshirt-2.png`,
			top: 1600,
			left: 1550,
			size: 1000,
		},
	],
	[ProductType.HOODIE]: [
		{
			path: `${templateBasePath}/hoodie-1.png`,
			top: 1370,
			left: 1600,
			size: 1000,
		},
		{
			path: `${templateBasePath}/hoodie-2.png`,
			top: 1200,
			left: 1550,
			size: 1000,
		},
	],
	[ProductType.CAP]: [
		{
			path: `${templateBasePath}/cap-1.png`,
			top: 360,
			left: 1870,
			size: 350,
		},
		{
			path: `${templateBasePath}/cap-2.png`,
			top: 270,
			left: 1675,
			size: 750,
		},
	],
	[ProductType.POSTER]: [
		{
			path: `${templateBasePath}/poster-1.png`,
			top: 1350,
			left: 1350,
			size: 1400,
		},
	],
	[ProductType.TOTEBAG]: [
		{
			path: `${templateBasePath}/totebag-1.png`,
			top: 1850,
			left: 1400,
			size: 1300,
		},
		{
			path: `${templateBasePath}/totebag-2.png`,
			top: 2550,
			left: 1500,
			size: 1100,
		},
	],
	[ProductType.STICKERS]: [
		{
			path: `${templateBasePath}/stickers-1.png`,
			top: 1550,
			left: 1350,
			size: 1000,
		},
	],
	[ProductType.PHONECASE]: {},
	[ProductType.BRACELET]: [
		{
			path: `${templateBasePath}/bracelet-1.png`,
			top: 2120,
			left: 1750,
			size: 600,
		},
	],
	[ProductType.MUG]: [
		{
			path: `${templateBasePath}/mug-1.png`,
			top: 1800,
			left: 1600,
			size: 900,
		},
	],
};

@Processor('productPreview')
export class ProductPreviewConsumer extends WorkerHost {
	constructor(
		private readonly bucketService: BucketService,
		private readonly productsService: ProductsService,
	) {
		super();
	}

	async process(job: Job<any, any, string>): Promise<any> {
		let cover: Buffer;

		switch (job.data.referenceType) {
			case 'song':
				cover = await this.bucketService.getFromSongCovers(job.data.referenceUuid);
				break;
			case 'album':
				cover = await this.bucketService.getFromAlbumCovers(job.data.referenceUuid);
				break;
			default:
				cover = await this.bucketService.getFromSongCovers(job.data.referenceUuid);
		}

		let i = 0;
		for (const preview of productPreviewMappings[job.data.type]) {
			const processedCover = await sharp(cover)
				.resize(preview.size, preview.size, {
					fit: 'cover',
					background: { r: 0, g: 0, b: 0, alpha: 0 },
				})
				.toBuffer();

			const template = fs.readFileSync(preview.path);

			const composition = await sharp(template)
				.composite([
					{
						input: processedCover,
						top: preview.top,
						left: preview.left,
					},
				])
				.jpeg({ quality: 85 })
				.toBuffer();

			await this.bucketService.saveToProductPreviews(
				`${job.data.productUuid}-${i}`,
				composition,
			);
			await this.productsService.addPreview(
				job.data.productUuid,
				`${process.env.APP_BASE_URL}/static/public/product-previews/${job.data.productUuid}-${i}`,
			);
			i++;
		}
	}
}
