import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { User } from '../../entities/user.entity';
import { PointTransaction } from '../../entities/point-transaction.entity';
import { ExchangeOrder } from '../../entities/exchange-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PointTransaction, ExchangeOrder])],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
