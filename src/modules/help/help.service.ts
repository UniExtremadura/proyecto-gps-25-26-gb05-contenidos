import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Help } from './schemas/help.schema';
import { Model } from 'mongoose';
import { CreateHelpDto } from './dto/create-help.dto';
import { UpdateHelpDto } from './dto/update-help.dto';

@Injectable()
export class HelpService {
	constructor(@InjectModel(Help.name) private helpModel: Model<Help>) {}

	async findAll(): Promise<Help[]> {
		return await this.helpModel.find().exec();
	}

	async findOneByUuid(uuid: string): Promise<Help> {
		const help = await this.helpModel.findOne({ uuid });
		if (!help) throw new NotFoundException();
		return help;
	}

	async create(createHelpDto: CreateHelpDto): Promise<Help> {
		const newHelp = new this.helpModel(createHelpDto);
		return await newHelp.save();
	}

	async update(uuid: string, updateHelpDto: UpdateHelpDto): Promise<Help> {
		const updatedHelp = await this.helpModel.findOneAndUpdate(
			{ uuid },
			{ $set: updateHelpDto },
			{ new: true },
		);

		if (!updatedHelp) throw new NotFoundException();

		return updatedHelp!;
	}

	async delete(uuid: string): Promise<void> {
		await this.helpModel.deleteOne({ uuid });
	}
}
