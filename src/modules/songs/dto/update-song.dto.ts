import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateSongDto } from './create-song.dto';
import {IsNotEmpty, ValidateNested} from "class-validator";
import {Transform, Type} from "class-transformer";
import {Pricing, type PricingType} from "../../../common/schemas/pricing.schema";

export class UpdateSongDto extends PartialType(CreateSongDto) {}
