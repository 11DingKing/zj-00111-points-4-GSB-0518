import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ description: '取消原因', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
