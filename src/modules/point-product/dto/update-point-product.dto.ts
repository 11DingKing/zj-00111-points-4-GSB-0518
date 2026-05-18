import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePointProductDto {
  @ApiProperty({ description: '商品名称', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '商品描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '所需积分', required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  pointsRequired?: number;

  @ApiProperty({ description: '库存数量', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ description: '每人限兑数量，0表示不限制', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  perUserLimit?: number;

  @ApiProperty({ description: '活动开始时间', required: false })
  @IsOptional()
  activityStartTime?: Date;

  @ApiProperty({ description: '活动结束时间', required: false })
  @IsOptional()
  activityEndTime?: Date;
}
