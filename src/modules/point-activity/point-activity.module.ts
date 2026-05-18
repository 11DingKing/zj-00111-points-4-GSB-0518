import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointActivity } from '../../entities/point-activity.entity';
import { UserCheckIn } from '../../entities/user-checkin.entity';
import { User } from '../../entities/user.entity';
import { PointActivityService } from './point-activity.service';
import { PointActivityController } from './point-activity.controller';
import { PointAccountModule } from '../point-account/point-account.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointActivity, UserCheckIn, User]),
    forwardRef(() => PointAccountModule),
  ],
  controllers: [PointActivityController],
  providers: [PointActivityService],
  exports: [PointActivityService],
})
export class PointActivityModule {}
