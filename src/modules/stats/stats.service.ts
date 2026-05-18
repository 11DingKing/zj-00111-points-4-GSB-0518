import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { User } from '../../entities/user.entity';
import { PointTransaction, TransactionType } from '../../entities/point-transaction.entity';
import { ExchangeOrder, OrderStatus } from '../../entities/exchange-order.entity';
import { BehaviorType } from '../../entities/point-rule.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PointTransaction)
    private transactionRepository: Repository<PointTransaction>,
    @InjectRepository(ExchangeOrder)
    private orderRepository: Repository<ExchangeOrder>,
  ) {}

  async getLeaderboard(type: 'total' | 'month' = 'total', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    let query = this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.pointBalance']);

    if (type === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      query = query
        .addSelect((subQuery) => {
          return subQuery
            .select('SUM(t.points)', 'monthPoints')
            .from(PointTransaction, 't')
            .where('t.userId = user.id')
            .andWhere('t.type = :type', { type: TransactionType.EARN })
            .andWhere('t.createdAt >= :start', { start: startOfMonth });
        }, 'monthPoints')
        .orderBy('monthPoints', 'DESC');
    } else {
      query = query.orderBy('user.pointBalance', 'DESC');
    }

    const rawItems = await query.skip(skip).take(limit).getRawMany();

    const total = await this.userRepository.count();

    const items = rawItems.map((item) => ({
      id: item.user_id,
      username: item.user_username,
      points: type === 'month' ? Number(item.monthPoints || 0) : item.user_pointBalance,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDailyStats(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const totalEarned = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.points)', 'total')
      .where('t.type = :type', { type: TransactionType.EARN })
      .andWhere('t.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    const totalSpent = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.points)', 'total')
      .where('t.type = :type', { type: TransactionType.SPEND })
      .andWhere('t.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    const earnCount = await this.transactionRepository.count({
      where: {
        type: TransactionType.EARN,
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    const exchangeCount = await this.orderRepository.count({
      where: {
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    return {
      date: targetDate.toISOString().split('T')[0],
      totalEarned: Number(totalEarned?.total || 0),
      totalSpent: Number(totalSpent?.total || 0),
      earnCount,
      exchangeCount,
    };
  }

  async getBehaviorStats(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.behaviorType', 'behaviorType')
      .addSelect('SUM(t.points)', 'totalPoints')
      .addSelect('COUNT(*)', 'count')
      .where('t.type = :type', { type: TransactionType.EARN })
      .andWhere('t.behaviorType IS NOT NULL')
      .andWhere('t.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .groupBy('t.behaviorType')
      .getRawMany();

    const behaviorNames: Record<BehaviorType, string> = {
      [BehaviorType.SIGN_IN]: '签到',
      [BehaviorType.CONSUME]: '消费',
      [BehaviorType.REVIEW]: '评价',
      [BehaviorType.INVITE]: '邀请好友',
    };

    return result.map((item) => ({
      behaviorType: item.behaviorType,
      behaviorName: behaviorNames[item.behaviorType as BehaviorType] || item.behaviorType,
      totalPoints: Number(item.totalPoints),
      count: Number(item.count),
    }));
  }

  async getTopProducts(limit: number = 10) {
    const result = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.productId', 'productId')
      .addSelect('o.productName', 'productName')
      .addSelect('COUNT(*)', 'exchangeCount')
      .addSelect('SUM(o.pointsSpent)', 'totalPoints')
      .where('o.status != :status', { status: OrderStatus.CANCELLED })
      .groupBy('o.productId')
      .addGroupBy('o.productName')
      .orderBy('exchangeCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((item) => ({
      productId: Number(item.productId),
      productName: item.productName,
      exchangeCount: Number(item.exchangeCount),
      totalPoints: Number(item.totalPoints),
    }));
  }

  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalUsers = await this.userRepository.count();

    const totalPointsEarned = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.points)', 'total')
      .where('t.type = :type', { type: TransactionType.EARN })
      .getRawOne();

    const totalPointsSpent = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.points)', 'total')
      .where('t.type = :type', { type: TransactionType.SPEND })
      .getRawOne();

    const totalOrders = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.status != :status', { status: OrderStatus.CANCELLED })
      .getCount();

    const todayEarned = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.points)', 'total')
      .where('t.type = :type', { type: TransactionType.EARN })
      .andWhere('t.createdAt >= :today', { today })
      .getRawOne();

    const todaySpent = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.points)', 'total')
      .where('t.type = :type', { type: TransactionType.SPEND })
      .andWhere('t.createdAt >= :today', { today })
      .getRawOne();

    return {
      totalUsers,
      totalPointsEarned: Number(totalPointsEarned?.total || 0),
      totalPointsSpent: Number(totalPointsSpent?.total || 0),
      totalOrders,
      todayEarned: Number(todayEarned?.total || 0),
      todaySpent: Number(todaySpent?.total || 0),
    };
  }
}
