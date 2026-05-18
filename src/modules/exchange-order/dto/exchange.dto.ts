import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class ExchangeDto {
  @ApiProperty({ description: '商品ID' })
  @IsNumber()
  @IsPositive()
  productId: number;
}
