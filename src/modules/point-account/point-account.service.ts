import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual, Between } from 'typeorm';
import * as NodeCache from 'node-cache';
import { User } from '../../entities/user.entity';
import { PointRule, BehaviorType } from '../../entities/point-rule.entity';
import { PointTransaction, TransactionType } from '../../entities/point-transaction.entity';
import { PointActivityService } from '../point-activity/point-activity.service';
import { EarnPointsDto } from './dto/earn-points.dto';

const pointLocks = new NodeCache({ stdTTL: 60 });

@Injectable()
export class PointAccountService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PointRule)
    private pointRuleRepository: Repository<PointRule>,
    @InjectRepository(PointTransaction)
    private transactionRepository: Repository<PointTransaction>,
    private dataSource: DataSource,
    private pointActivityService: PointActivityService,
  ) {}

  private async acquireLock(userId: number, behaviorType: BehaviorType): Promise<boolean> {
    const key = `lock:${userId}:${behaviorType}`;
    if (pointLocks.has(key)) {
      return false;
    }
    pointLocks.set(key, true, 60);
    return true;
  }

  private releaseLock(userId: number, behaviorType: BehaviorType) {
    const key = `lock:${userId}:${behaviorType}`;
    pointLocks.del(key);
  }

  async earnPoints(user: User, earnDto: EarnPointsDto) {
    const { behaviorType, description } = earnDto;

    const lockAcquired = await this.acquireLock(user.id, behaviorType);
    if (!lockAcquired) {
      throw new BadRequestException('操作太频繁，请稍后再试');
    }

    try {
      const rule = await this.pointRuleRepository.findOneBy({ behaviorType });
      if (!rule || !rule.enabled) {
        throw new BadRequestException('该积分规则不存在或已禁用');
      }

      if (rule.cooldownSeconds > 0) {
        const cooldownTime = new Date(Date.now() - rule.cooldownSeconds * 1000);
        const lastTransaction = await this.transactionRepository.findOne({
          where: {
            userId: user.id,
            behaviorType,
            type: TransactionType.EARN,
          },
          order: { createdAt: 'DESC' },
        });
        if (lastTransaction && lastTransaction.createdAt > cooldownTime) {
          const waitTime = Math.ceil(
            (lastTransaction.createdAt.getTime() + rule.cooldownSeconds * 1000 - Date.now()) / 1000,
          );
          throw new BadRequestException(`冷却时间未到，请等待 ${waitTime} 秒后再试`);
        }
      }

      const multiplier = await this.pointActivityService.calculateEffectiveMultiplier(behaviorType);
      const basePoints = rule.points;
      const multipliedPoints = Math.floor(basePoints * multiplier);
      let totalPoints = multipliedPoints;
      let bonusPoints = 0;
      let consecutiveDays = user.consecutiveCheckinDays;

      if (rule.dailyLimit > 0) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayEarned = await this.transactionRepository
          .createQueryBuilder('t')
          .select('SUM(t.points)', 'total')
          .where('t.userId = :userId', { userId: user.id })
          .andWhere('t.behaviorType = :behaviorType', { behaviorType })
          .andWhere('t.type = :type', { type: TransactionType.EARN })
          .andWhere('t.createdAt BETWEEN :start AND :end', {
            start: todayStart,
            end: todayEnd,
          })
          .getRawOne();

        const totalToday = parseInt(todayEarned?.total || '0', 10);
        if (totalToday + totalPoints > rule.dailyLimit) {
          throw new BadRequestException(`今日该行为积分已达上限 ${rule.dailyLimit}`);
        }
      }

      if (behaviorType === BehaviorType.SIGN_IN) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (user.lastCheckinDate === yesterday) {
          consecutiveDays = user.consecutiveCheckinDays + 1;
        } else if (user.lastCheckinDate !== today) {
          consecutiveDays = 1;
        }

        bonusPoints = await this.pointActivityService.getCheckinBonus(consecutiveDays);
        totalPoints += bonusPoints;
      }

      return await this.dataSource.transaction(async (manager) => {
        const newBalance = user.pointBalance + totalPoints;

        let descriptionText = description || rule.behaviorName;
        if (multiplier > 1) {
          descriptionText += ` (${multiplier}倍活动)`;
        }
        if (bonusPoints > 0) {
          descriptionText += ` (连续${consecutiveDays}天签到奖励)`;
        }

        const transaction = manager.create(PointTransaction, {
          userId: user.id,
          type: TransactionType.EARN,
          behaviorType,
          points: totalPoints,
          description: descriptionText,
          balanceAfter: newBalance,
        });
        await manager.save(transaction);

        await manager.update(User, user.id, { pointBalance: newBalance });

        if (behaviorType === BehaviorType.SIGN_IN) {
          await this.pointActivityService.recordCheckin(user, multipliedPoints, bonusPoints);
        }

        return {
          transaction,
          newBalance,
          basePoints,
          multiplier,
          multipliedPoints,
          bonusPoints,
          consecutiveDays,
        };
      });
    } finally {
      this.releaseLock(user.id, behaviorType);
    }
  }

  async getTransactions(
    user: User,
    page: number = 1,
    limit: number = 20,
    behaviorType?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { userId: user.id };

    if (behaviorType) {
      where.behaviorType = behaviorType;
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      where.createdAt = Between(start, end);
    }

    const [items, total] = await this.transactionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
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

  async getBalance(user: User) {
    return {
      balance: user.pointBalance,
    };
  }
}
