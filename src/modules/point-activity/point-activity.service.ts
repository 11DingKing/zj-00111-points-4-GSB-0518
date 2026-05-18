import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { PointActivity, ActivityType } from '../../entities/point-activity.entity';
import { UserCheckIn } from '../../entities/user-checkin.entity';
import { User } from '../../entities/user.entity';
import { BehaviorType } from '../../entities/point-rule.entity';
import { CreatePointActivityDto } from './dto/create-point-activity.dto';
import { UpdatePointActivityDto } from './dto/update-point-activity.dto';

@Injectable()
export class PointActivityService {
  constructor(
    @InjectRepository(PointActivity)
    private activityRepository: Repository<PointActivity>,
    @InjectRepository(UserCheckIn)
    private checkinRepository: Repository<UserCheckIn>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createDto: CreatePointActivityDto) {
    if (createDto.startTime >= createDto.endTime) {
      throw new BadRequestException('活动开始时间必须早于结束时间');
    }

    if (createDto.activityType === ActivityType.MULTIPLIER && !createDto.behaviorType) {
      throw new BadRequestException('翻倍活动必须指定行为类型');
    }

    if (createDto.activityType === ActivityType.CHECKIN_REWARD && (!createDto.consecutiveDays || !createDto.bonusPoints)) {
      throw new BadRequestException('签到奖励活动必须指定连续天数和奖励积分');
    }

    const activity = this.activityRepository.create(createDto);
    return await this.activityRepository.save(activity);
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.activityRepository.findAndCount({
      order: { priority: 'DESC', createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const activity = await this.activityRepository.findOneBy({ id });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }
    return activity;
  }

  async update(id: number, updateDto: UpdatePointActivityDto) {
    const activity = await this.findOne(id);
    Object.assign(activity, updateDto);
    return await this.activityRepository.save(activity);
  }

  async remove(id: number) {
    const activity = await this.findOne(id);
    await this.activityRepository.remove(activity);
    return { message: '删除成功' };
  }

  async toggle(id: number) {
    const activity = await this.findOne(id);
    activity.enabled = !activity.enabled;
    return await this.activityRepository.save(activity);
  }

  async getActiveActivities(behaviorType?: BehaviorType) {
    const now = new Date();
    const where: any = {
      enabled: true,
      startTime: LessThanOrEqual(now),
      endTime: MoreThanOrEqual(now),
    };

    if (behaviorType) {
      where.behaviorType = behaviorType;
    }

    const activities = await this.activityRepository.find({
      where,
      order: { priority: 'DESC' },
    });

    return activities;
  }

  async getUpcomingActivities(days: number = 7) {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const activities = await this.activityRepository.find({
      where: {
        enabled: true,
        startTime: Between(now, future),
      },
      order: { startTime: 'ASC' },
    });

    return activities;
  }

  async calculateEffectiveMultiplier(behaviorType: BehaviorType): Promise<number> {
    const activities = await this.getActiveActivities(behaviorType);
    const multiplierActivities = activities.filter(
      (a) => a.activityType === ActivityType.MULTIPLIER,
    );

    if (multiplierActivities.length === 0) {
      return 1;
    }

    const stackableActivities = multiplierActivities.filter((a) => a.stackable);
    const nonStackableActivities = multiplierActivities.filter((a) => !a.stackable);

    let totalMultiplier = 1;

    if (nonStackableActivities.length > 0) {
      const highestPriorityNonStackable = nonStackableActivities[0];
      totalMultiplier = highestPriorityNonStackable.multiplier;
    }

    for (const activity of stackableActivities) {
      totalMultiplier *= activity.multiplier;
    }

    return totalMultiplier;
  }

  async getCheckinBonus(consecutiveDays: number): Promise<number> {
    const activities = await this.getActiveActivities();
    const checkinActivities = activities.filter(
      (a) => a.activityType === ActivityType.CHECKIN_REWARD,
    );

    let totalBonus = 0;
    const matchedActivities = checkinActivities.filter(
      (a) => consecutiveDays >= a.consecutiveDays,
    );

    const stackableActivities = matchedActivities.filter((a) => a.stackable);
    const nonStackableActivities = matchedActivities.filter((a) => !a.stackable);

    if (nonStackableActivities.length > 0) {
      const highestPriorityNonStackable = nonStackableActivities[0];
      totalBonus = highestPriorityNonStackable.bonusPoints;
    }

    for (const activity of stackableActivities) {
      totalBonus += activity.bonusPoints;
    }

    return totalBonus;
  }

  async getUserCheckinStatus(user: User) {
    const today = new Date().toISOString().split('T')[0];
    const hasCheckedInToday = !!(await this.checkinRepository.findOneBy({
      userId: user.id,
      checkinDate: today,
    }));

    return {
      consecutiveDays: user.consecutiveCheckinDays,
      lastCheckinDate: user.lastCheckinDate,
      hasCheckedInToday,
    };
  }

  async recordCheckin(user: User, pointsEarned: number, bonusPointsEarned: number) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let consecutiveDays = 1;

    if (user.lastCheckinDate === yesterday) {
      consecutiveDays = user.consecutiveCheckinDays + 1;
    } else if (user.lastCheckinDate !== today) {
      consecutiveDays = 1;
    }

    const checkin = this.checkinRepository.create({
      userId: user.id,
      checkinDate: today,
      consecutiveDays,
      pointsEarned,
      bonusPointsEarned,
    });

    await this.checkinRepository.save(checkin);

    await this.userRepository.update(user.id, {
      consecutiveCheckinDays: consecutiveDays,
      lastCheckinDate: today,
    });

    return { consecutiveDays, bonusPointsEarned };
  }

  async getUserCheckinHistory(user: User, page: number = 1, limit: number = 30) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.checkinRepository.findAndCount({
      where: { userId: user.id },
      order: { checkinDate: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
