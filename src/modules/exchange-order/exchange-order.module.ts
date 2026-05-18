import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeOrderService } from './exchange-order.service';
import { ExchangeOrderController } from './exchange-order.controller';
import { ExchangeOrder } from '../../entities/exchange-order.entity';
import { PointProduct } from '../../entities/point-product.entity';
import { User } from '../../entities/user.entity';
import { PointTransaction } from '../../entities/point-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeOrder, PointProduct, User, PointTransaction])],
  controllers: [ExchangeOrderController],
  providers: [ExchangeOrderService],
  exports: [ExchangeOrderService],
})
export class ExchangeOrderModule {}
