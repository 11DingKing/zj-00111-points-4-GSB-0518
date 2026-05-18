import { IsString, IsEnum, IsNumber, IsDate, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '../../../entities/point-activity.entity';
import { BehaviorType } from '../../../entities/point-rule.entity';

export class CreatePointActivityDto {
  @ApiProperty({ description: '活动名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '活动描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '活动类型', enum: ActivityType })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiPropertyOptional({ description: '适用行为类型', enum: BehaviorType })
  @IsOptional()
  @IsEnum(BehaviorType)
  behaviorType?: BehaviorType;

  @ApiPropertyOptional({ description: '翻倍倍数', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  multiplier?: number;

  @ApiPropertyOptional({ description: '连续签到天数', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consecutiveDays?: number;

  @ApiPropertyOptional({ description: '奖励积分', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusPoints?: number;

  @ApiProperty({ description: '开始时间' })
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @ApiProperty({ description: '结束时间' })
  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @ApiPropertyOptional({ description: '优先级，数字越大优先级越高', default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: '是否可叠加', default: true })
  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
