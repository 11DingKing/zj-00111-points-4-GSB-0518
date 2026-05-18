import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointProductService } from './point-product.service';
import { PointProductController } from './point-product.controller';
import { PointProduct } from '../../entities/point-product.entity';
import { PointActivityModule } from '../point-activity/point-activity.module';

@Module({
  imports: [TypeOrmModule.forFeature([PointProduct]), PointActivityModule],
  controllers: [PointProductController],
  providers: [PointProductService],
  exports: [PointProductService],
})
export class PointProductModule {}
