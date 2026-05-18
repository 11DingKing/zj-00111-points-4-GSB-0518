import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { PointRuleModule } from './modules/point-rule/point-rule.module';
import { PointAccountModule } from './modules/point-account/point-account.module';
import { PointProductModule } from './modules/point-product/point-product.module';
import { ExchangeOrderModule } from './modules/exchange-order/exchange-order.module';
import { StatsModule } from './modules/stats/stats.module';
import { HealthModule } from './modules/health/health.module';
import { PointActivityModule } from './modules/point-activity/point-activity.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: './data/app.db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    }),
    AuthModule,
    PointRuleModule,
    PointActivityModule,
    PointAccountModule,
    PointProductModule,
    ExchangeOrderModule,
    StatsModule,
    HealthModule,
  ],
})
export class AppModule {}
