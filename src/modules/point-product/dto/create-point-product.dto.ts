import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, IsDate } from 'class-validator';

export class CreatePointProductDto {
  @ApiProperty({ description: '商品名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '商品描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '所需积分' })
  @IsNumber()
  @Min(1)
  pointsRequired: number;

  @ApiProperty({ description: '库存数量' })
  @IsNumber()
  @Min(0)
  stock: number;

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
