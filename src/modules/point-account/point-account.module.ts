import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointAccountService } from './point-account.service';
import { PointAccountController } from './point-account.controller';
import { User } from '../../entities/user.entity';
import { PointRule } from '../../entities/point-rule.entity';
import { PointTransaction } from '../../entities/point-transaction.entity';
import { PointActivityModule } from '../point-activity/point-activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PointRule, PointTransaction]),
    forwardRef(() => PointActivityModule),
  ],
  controllers: [PointAccountController],
  providers: [PointAccountService],
  exports: [PointAccountService],
})
export class PointAccountModule {}
