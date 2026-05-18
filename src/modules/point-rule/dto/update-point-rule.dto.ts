import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePointRuleDto {
  @ApiProperty({ description: '积分数值', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number;

  @ApiProperty({ description: '每日上限，0表示不限制', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyLimit?: number;

  @ApiProperty({ description: '冷却时间（秒），0表示不限制', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cooldownSeconds?: number;
}
