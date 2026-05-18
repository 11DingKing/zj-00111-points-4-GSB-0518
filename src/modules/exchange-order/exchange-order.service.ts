import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ExchangeOrder, OrderStatus } from '../../entities/exchange-order.entity';
import { PointProduct } from '../../entities/point-product.entity';
import { User } from '../../entities/user.entity';
import { PointTransaction, TransactionType } from '../../entities/point-transaction.entity';
import { ExchangeDto } from './dto/exchange.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ShipOrderDto } from './dto/ship-order.dto';

function generateOrderNo(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EX${timestamp}${random}`;
}

@Injectable()
export class ExchangeOrderService {
  constructor(
    @InjectRepository(ExchangeOrder)
    private orderRepository: Repository<ExchangeOrder>,
    @InjectRepository(PointProduct)
    private productRepository: Repository<PointProduct>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PointTransaction)
    private transactionRepository: Repository<PointTransaction>,
    private dataSource: DataSource,
  ) {}

  async exchange(user: User, exchangeDto: ExchangeDto) {
    const { productId } = exchangeDto;

    const product = await this.productRepository.findOneBy({ id: productId });
    if (!product || !product.enabled) {
      throw new NotFoundException('商品不存在或已下架');
    }

    if (product.stock <= 0) {
      throw new BadRequestException('商品库存不足');
    }

    const now = new Date();
    if (product.activityStartTime && now < product.activityStartTime) {
      throw new BadRequestException('活动尚未开始');
    }
    if (product.activityEndTime && now > product.activityEndTime) {
      throw new BadRequestException('活动已结束');
    }

    if (user.pointBalance < product.pointsRequired) {
      throw new BadRequestException('积分不足');
    }

    if (product.perUserLimit > 0) {
      const userExchangedCount = await this.orderRepository.count({
        where: {
          userId: user.id,
          productId,
        },
      });
      if (userExchangedCount >= product.perUserLimit) {
        throw new BadRequestException(`每人限兑 ${product.perUserLimit} 件`);
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const updateResult = await manager
        .createQueryBuilder()
        .update(PointProduct)
        .set({ stock: () => 'stock - 1', version: () => 'version + 1' })
        .where('id = :id', { id: productId })
        .andWhere('version = :version', { version: product.version })
        .andWhere('stock > 0')
        .execute();

      if (updateResult.affected === 0) {
        throw new BadRequestException('兑换失败，请重试');
      }

      const newBalance = user.pointBalance - product.pointsRequired;

      const order = manager.create(ExchangeOrder, {
        orderNo: generateOrderNo(),
        userId: user.id,
        productId,
        productName: product.name,
        pointsSpent: product.pointsRequired,
        status: OrderStatus.PENDING_SHIPMENT,
      });
      await manager.save(order);

      const transaction = manager.create(PointTransaction, {
        userId: user.id,
        type: TransactionType.SPEND,
        points: product.pointsRequired,
        description: `兑换商品：${product.name}`,
        orderId: order.id,
        balanceAfter: newBalance,
      });
      await manager.save(transaction);

      await manager.update(User, user.id, { pointBalance: newBalance });

      return {
        order,
        newBalance,
      };
    });
  }

  async getMyOrders(user: User, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.orderRepository.findAndCount({
      where: { userId: user.id },
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

  async getAllOrders(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.orderRepository.findAndCount({
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

  async getOrderDetail(user: User, orderId: number) {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('无权查看此订单');
    }
    return order;
  }

  async cancelOrder(user: User, orderId: number, cancelDto: CancelOrderDto) {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('无权取消此订单');
    }
    if (order.status !== OrderStatus.PENDING_SHIPMENT) {
      throw new BadRequestException('只能取消待发货的订单');
    }

    return await this.dataSource.transaction(async (manager) => {
      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancelReason = cancelDto.reason;
      await manager.save(order);

      await manager
        .createQueryBuilder()
        .update(PointProduct)
        .set({ stock: () => 'stock + 1' })
        .where('id = :id', { id: order.productId })
        .execute();

      const orderUser = await manager.findOneBy(User, { id: order.userId });
      const newBalance = orderUser.pointBalance + order.pointsSpent;

      const refundTransaction = manager.create(PointTransaction, {
        userId: order.userId,
        type: TransactionType.REFUND,
        points: order.pointsSpent,
        description: `订单退款：${order.orderNo}`,
        orderId: order.id,
        balanceAfter: newBalance,
      });
      await manager.save(refundTransaction);

      await manager.update(User, order.userId, { pointBalance: newBalance });

      return order;
    });
  }

  async shipOrder(orderId: number, shipDto: ShipOrderDto) {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.PENDING_SHIPMENT) {
      throw new BadRequestException('只能发运待发货的订单');
    }

    order.status = OrderStatus.SHIPPED;
    order.trackingNumber = shipDto.trackingNumber;
    order.shippedAt = new Date();
    return this.orderRepository.save(order);
  }

  async confirmDelivery(user: User, orderId: number) {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('无权操作此订单');
    }
    if (order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException('只能确认已发货的订单');
    }

    order.status = OrderStatus.DELIVERED;
    order.deliveredAt = new Date();
    return this.orderRepository.save(order);
  }
}
