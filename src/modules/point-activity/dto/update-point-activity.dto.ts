import { PartialType } from '@nestjs/swagger';
import { CreatePointActivityDto } from './create-point-activity.dto';

export class UpdatePointActivityDto extends PartialType(CreatePointActivityDto) {}
