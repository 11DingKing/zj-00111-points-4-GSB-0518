import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ShipOrderDto {
  @ApiProperty({ description: '物流单号' })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}
