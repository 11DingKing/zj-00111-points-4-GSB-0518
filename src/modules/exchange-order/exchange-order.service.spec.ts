import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ExchangeOrder,
  OrderStatus,
} from '../../entities/exchange-order.entity';
import { PointProduct } from '../../entities/point-product.entity';
import { User, UserRole } from '../../entities/user.entity';
import {
  PointTransaction,
  TransactionType,
} from '../../entities/point-transaction.entity';
import { ExchangeOrderService } from './exchange-order.service';
import { ExchangeDto } from './dto/exchange.dto';
import { ShipOrderDto } from './dto/ship-order.dto';

describe('ExchangeOrderService', () => {
  let service: ExchangeOrderService;
  let orderRepository: jest.Mocked<Repository<ExchangeOrder>>;
  let productRepository: jest.Mocked<Repository<PointProduct>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let transactionRepository: jest.Mocked<Repository<PointTransaction>>;
  let dataSource: { transaction: jest.Mock };

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashed',
    role: UserRole.USER,
    pointBalance: 500,
    consecutiveCheckinDays: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    transactions: [],
    orders: [],
    checkins: [],
  };

  const mockProduct: PointProduct = {
    id: 10,
    name: '测试商品',
    description: '描述',
    pointsRequired: 100,
    stock: 5,
    perUserLimit: 0,
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockOrderRepo = {
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };

    const mockProductRepo = {
      findOneBy: jest.fn(),
    };

    const mockUserRepo = {
      findOneBy: jest.fn(),
    };

    const mockTransactionRepo = {};

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeOrderService,
        {
          provide: getRepositoryToken(ExchangeOrder),
          useValue: mockOrderRepo,
        },
        {
          provide: getRepositoryToken(PointProduct),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(PointTransaction),
          useValue: mockTransactionRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ExchangeOrderService>(ExchangeOrderService);
    orderRepository = module.get(getRepositoryToken(ExchangeOrder));
    productRepository = module.get(getRepositoryToken(PointProduct));
    userRepository = module.get(getRepositoryToken(User));
    transactionRepository = module.get(getRepositoryToken(PointTransaction));
    dataSource = module.get(DataSource);
  });

  describe('exchange - 积分不足校验', () => {
    it('should throw BadRequestException when user has insufficient points', async () => {
      const poorUser = { ...mockUser, pointBalance: 50 };
      productRepository.findOneBy.mockResolvedValue(mockProduct);

      await expect(
        service.exchange(poorUser, { productId: 10 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.exchange(poorUser, { productId: 10 }),
      ).rejects.toThrow('积分不足');
    });

    it('should throw BadRequestException when points equal zero', async () => {
      const zeroUser = { ...mockUser, pointBalance: 0 };
      productRepository.findOneBy.mockResolvedValue(mockProduct);

      await expect(
        service.exchange(zeroUser, { productId: 10 }),
      ).rejects.toThrow('积分不足');
    });
  });

  describe('exchange - 正常扣减积分+生成订单', () => {
    it('should deduct points, create order and transaction in a transaction', async () => {
      productRepository.findOneBy.mockResolvedValue(mockProduct);
      orderRepository.count.mockResolvedValue(0);

      const savedOrder: Partial<ExchangeOrder> = {
        id: 100,
        orderNo: 'EX123',
        userId: 1,
        productId: 10,
        productName: '测试商品',
        pointsSpent: 100,
        status: OrderStatus.PENDING_SHIPMENT,
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
      };

      mockManager.create.mockReturnValueOnce(savedOrder).mockReturnValueOnce({
        id: 200,
        userId: 1,
        type: TransactionType.SPEND,
        points: 100,
        balanceAfter: 400,
      });

      mockManager.save
        .mockResolvedValueOnce(savedOrder)
        .mockResolvedValueOnce({});

      dataSource.transaction.mockImplementation(async (cb) => {
        return cb(mockManager);
      });

      const result = await service.exchange(mockUser, { productId: 10 });

      expect(result.order).toEqual(savedOrder);
      expect(result.newBalance).toBe(400);
      expect(dataSource.transaction).toHaveBeenCalled();

      expect(mockManager.create).toHaveBeenCalledWith(
        ExchangeOrder,
        expect.objectContaining({
          userId: 1,
          productId: 10,
          pointsSpent: 100,
          status: OrderStatus.PENDING_SHIPMENT,
        }),
      );

      expect(mockManager.create).toHaveBeenCalledWith(
        PointTransaction,
        expect.objectContaining({
          userId: 1,
          type: TransactionType.SPEND,
          points: 100,
          balanceAfter: 400,
        }),
      );

      expect(mockManager.update).toHaveBeenCalledWith(User, 1, {
        pointBalance: 400,
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.exchange(mockUser, { productId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when product is disabled', async () => {
      const disabledProduct = { ...mockProduct, enabled: false };
      productRepository.findOneBy.mockResolvedValue(disabledProduct);

      await expect(
        service.exchange(mockUser, { productId: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when product stock is zero', async () => {
      const outOfStockProduct = { ...mockProduct, stock: 0 };
      productRepository.findOneBy.mockResolvedValue(outOfStockProduct);

      await expect(
        service.exchange(mockUser, { productId: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('订单状态流转 - pending → shipped → delivered', () => {
    const createPendingOrder = (): ExchangeOrder =>
      ({
        id: 100,
        orderNo: 'EX123',
        userId: 1,
        productId: 10,
        productName: '测试商品',
        pointsSpent: 100,
        status: OrderStatus.PENDING_SHIPMENT,
      }) as ExchangeOrder;

    it('should transition from PENDING_SHIPMENT to SHIPPED via shipOrder', async () => {
      const pendingOrder = createPendingOrder();
      const shippedOrder: ExchangeOrder = {
        ...pendingOrder,
        status: OrderStatus.SHIPPED,
        trackingNumber: 'SF1234567890',
        shippedAt: expect.any(Date),
      } as ExchangeOrder;

      orderRepository.findOneBy.mockResolvedValue(pendingOrder);
      orderRepository.save.mockResolvedValue(shippedOrder);

      const shipDto: ShipOrderDto = { trackingNumber: 'SF1234567890' };
      const result = await service.shipOrder(100, shipDto);

      expect(result.status).toBe(OrderStatus.SHIPPED);
      expect(result.trackingNumber).toBe('SF1234567890');
      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.SHIPPED,
          trackingNumber: 'SF1234567890',
        }),
      );
    });

    it('should transition from SHIPPED to DELIVERED via confirmDelivery', async () => {
      const shippedOrder: ExchangeOrder = {
        ...createPendingOrder(),
        status: OrderStatus.SHIPPED,
        trackingNumber: 'SF1234567890',
        shippedAt: new Date(),
      } as ExchangeOrder;

      const deliveredOrder: ExchangeOrder = {
        ...shippedOrder,
        status: OrderStatus.DELIVERED,
        deliveredAt: expect.any(Date),
      } as ExchangeOrder;

      orderRepository.findOneBy.mockResolvedValue(shippedOrder);
      orderRepository.save.mockResolvedValue(deliveredOrder);

      const result = await service.confirmDelivery(mockUser, 100);

      expect(result.status).toBe(OrderStatus.DELIVERED);
      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.DELIVERED,
        }),
      );
    });

    it('should throw BadRequestException when shipping a non-pending order', async () => {
      const shippedOrder: ExchangeOrder = {
        ...createPendingOrder(),
        status: OrderStatus.SHIPPED,
      } as ExchangeOrder;

      orderRepository.findOneBy.mockResolvedValue(shippedOrder);

      await expect(
        service.shipOrder(100, { trackingNumber: 'SF000' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when confirming delivery of non-shipped order', async () => {
      orderRepository.findOneBy.mockResolvedValue(createPendingOrder());

      await expect(service.confirmDelivery(mockUser, 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when shipping a non-existent order', async () => {
      orderRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.shipOrder(999, { trackingNumber: 'SF000' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-owner confirms delivery', async () => {
      const otherUser = { ...mockUser, id: 2 };
      const shippedOrder: ExchangeOrder = {
        ...createPendingOrder(),
        status: OrderStatus.SHIPPED,
      } as ExchangeOrder;

      orderRepository.findOneBy.mockResolvedValue(shippedOrder);

      await expect(service.confirmDelivery(otherUser, 100)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin to confirm delivery of other users order', async () => {
      const adminUser: User = { ...mockUser, id: 2, role: UserRole.ADMIN };
      const shippedOrder: ExchangeOrder = {
        ...createPendingOrder(),
        status: OrderStatus.SHIPPED,
        trackingNumber: 'SF1234567890',
      } as ExchangeOrder;

      orderRepository.findOneBy.mockResolvedValue(shippedOrder);
      orderRepository.save.mockResolvedValue({
        ...shippedOrder,
        status: OrderStatus.DELIVERED,
      });

      const result = await service.confirmDelivery(adminUser, 100);
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });
  });
});
