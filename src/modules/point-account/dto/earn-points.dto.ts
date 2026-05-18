import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BehaviorType } from '../../../entities/point-rule.entity';

export class EarnPointsDto {
  @ApiProperty({ description: '行为类型', enum: BehaviorType })
  @IsEnum(BehaviorType)
  behaviorType: BehaviorType;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
