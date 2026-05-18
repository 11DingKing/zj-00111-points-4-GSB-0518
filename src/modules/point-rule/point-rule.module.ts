import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointRuleService } from './point-rule.service';
import { PointRuleController } from './point-rule.controller';
import { PointRule } from '../../entities/point-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PointRule])],
  controllers: [PointRuleController],
  providers: [PointRuleService],
  exports: [PointRuleService],
})
export class PointRuleModule {}
