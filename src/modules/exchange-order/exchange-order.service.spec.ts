import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExchangeOrderService } from './exchange-order.service';
import { ExchangeOrder, OrderStatus } from '../../entities/exchange-order.entity';
import { PointProduct } from '../../entities/point-product.entity';
import { User, UserRole } from '../../entities/user.entity';
import { PointTransaction, TransactionType } from '../../entities/point-transaction.entity';
import { ExchangeDto } from './dto/exchange.dto';
import { ShipOrderDto } from './dto/ship-order.dto';

describe('ExchangeOrderService', () => {
  let service: ExchangeOrderService;
  let orderRepository: Repository<ExchangeOrder>;
  let productRepository: Repository<PointProduct>;
  let userRepository: Repository<User>;
  let transactionRepository: Repository<PointTransaction>;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    role: UserRole.USER,
    pointBalance: 200,
    consecutiveCheckinDays: 0,
    lastCheckinDate: null,
    transactions: [],
    orders: [],
    checkins: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct: PointProduct = {
    id: 1,
    name: '测试商品',
    description: '测试商品描述',
    pointsRequired: 100,
    stock: 10,
    perUserLimit: 2,
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrder: ExchangeOrder = {
    id: 1,
    orderNo: 'EX1234567890ABC',
    userId: 1,
    user: mockUser,
    productId: 1,
    product: mockProduct,
    productName: '测试商品',
    pointsSpent: 100,
    status: OrderStatus.PENDING_SHIPMENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    queryRunner = {
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        findOneBy: jest.fn(),
      },
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeOrderService,
        {
          provide: getRepositoryToken(ExchangeOrder),
          useValue: {
            findOneBy: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PointProduct),
          useValue: {
            findOneBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PointTransaction),
          useValue: {
            findOneBy: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) => callback(queryRunner.manager)),
          },
        },
      ],
    }).compile();

    service = module.get<ExchangeOrderService>(ExchangeOrderService);
    orderRepository = module.get<Repository<ExchangeOrder>>(
      getRepositoryToken(ExchangeOrder),
    );
    productRepository = module.get<Repository<PointProduct>>(
      getRepositoryToken(PointProduct),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    transactionRepository = module.get<Repository<PointTransaction>>(
      getRepositoryToken(PointTransaction),
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exchange - 积分不足校验', () => {
    it('应该抛出积分不足异常当用户积分不够时', async () => {
      const exchangeDto: ExchangeDto = { productId: 1 };
      const poorUser = { ...mockUser, pointBalance: 50 };

      jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'count').mockResolvedValue(0);

      await expect(service.exchange(poorUser, exchangeDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.exchange(poorUser, exchangeDto)).rejects.toThrow(
        '积分不足',
      );
    });

    it('应该抛出商品不存在异常当商品已下架时', async () => {
      const exchangeDto: ExchangeDto = { productId: 1 };
      const disabledProduct = { ...mockProduct, enabled: false };

      jest
        .spyOn(productRepository, 'findOneBy')
        .mockResolvedValue(disabledProduct);

      await expect(service.exchange(mockUser, exchangeDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该抛出库存不足异常当商品库存为0时', async () => {
      const exchangeDto: ExchangeDto = { productId: 1 };
      const outOfStockProduct = { ...mockProduct, stock: 0 };

      jest
        .spyOn(productRepository, 'findOneBy')
        .mockResolvedValue(outOfStockProduct);

      await expect(service.exchange(mockUser, exchangeDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.exchange(mockUser, exchangeDto)).rejects.toThrow(
        '商品库存不足',
      );
    });

    it('应该抛出超过限购数量异常', async () => {
      const exchangeDto: ExchangeDto = { productId: 1 };

      jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'count').mockResolvedValue(2);

      await expect(service.exchange(mockUser, exchangeDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.exchange(mockUser, exchangeDto)).rejects.toThrow(
        '每人限兑 2 件',
      );
    });
  });

  describe('exchange - 正常扣减积分+生成订单流程', () => {
    it('应该成功创建订单并扣减积分', async () => {
      const exchangeDto: ExchangeDto = { productId: 1 };
      const newBalance = mockUser.pointBalance - mockProduct.pointsRequired;

      jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'count').mockResolvedValue(0);

      queryRunner.manager.create = jest
        .fn()
        .mockImplementation((entity, data) => ({
          ...data,
          id: entity === ExchangeOrder ? 1 : 1,
        }));
      queryRunner.manager.save = jest.fn().mockResolvedValue({});
      queryRunner.manager.update = jest.fn().mockResolvedValue({});

      const result = await service.exchange(mockUser, exchangeDto);

      expect(result.newBalance).toBe(newBalance);
      expect(result.order).toBeDefined();
      expect(result.order.status).toBe(OrderStatus.PENDING_SHIPMENT);
      expect(queryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        User,
        mockUser.id,
        { pointBalance: newBalance },
      );
    });

    it('应该在事务中创建消费记录', async () => {
      const exchangeDto: ExchangeDto = { productId: 1 };

      jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'count').mockResolvedValue(0);

      queryRunner.manager.create = jest
        .fn()
        .mockImplementation((entity, data) => ({
          ...data,
          id: entity === ExchangeOrder ? 1 : 1,
        }));
      queryRunner.manager.save = jest.fn().mockResolvedValue({});
      queryRunner.manager.update = jest.fn().mockResolvedValue({});

      await service.exchange(mockUser, exchangeDto);

      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        PointTransaction,
        expect.objectContaining({
          userId: mockUser.id,
          type: TransactionType.SPEND,
          points: mockProduct.pointsRequired,
          description: `兑换商品：${mockProduct.name}`,
        }),
      );
    });
  });

  describe('订单状态流转', () => {
    describe('shipOrder', () => {
      it('应该将待发货订单状态更新为已发货', async () => {
        const shipDto: ShipOrderDto = { trackingNumber: 'SF1234567890' };
        const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING_SHIPMENT };
        const shippedOrder = {
          ...pendingOrder,
          status: OrderStatus.SHIPPED,
          trackingNumber: shipDto.trackingNumber,
          shippedAt: expect.any(Date),
        };

        jest.spyOn(orderRepository, 'findOneBy').mockResolvedValue(pendingOrder);
        jest.spyOn(orderRepository, 'save').mockResolvedValue(shippedOrder);

        const result = await service.shipOrder(1, shipDto);

        expect(result.status).toBe(OrderStatus.SHIPPED);
        expect(result.trackingNumber).toBe(shipDto.trackingNumber);
        expect(orderRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: OrderStatus.SHIPPED,
            trackingNumber: shipDto.trackingNumber,
          }),
        );
      });

      it('应该抛出异常当订单状态不是待发货时', async () => {
        const shipDto: ShipOrderDto = { trackingNumber: 'SF1234567890' };
        const shippedOrder = { ...mockOrder, status: OrderStatus.SHIPPED };

        jest.spyOn(orderRepository, 'findOneBy').mockResolvedValue(shippedOrder);

        await expect(service.shipOrder(1, shipDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('应该抛出异常当订单不存在时', async () => {
        const shipDto: ShipOrderDto = { trackingNumber: 'SF1234567890' };

        jest.spyOn(orderRepository, 'findOneBy').mockResolvedValue(null);

        await expect(service.shipOrder(999, shipDto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('confirmDelivery', () => {
      it('应该将已发货订单状态更新为已签收', async () => {
        const shippedOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
        const deliveredOrder = {
          ...shippedOrder,
          status: OrderStatus.DELIVERED,
          deliveredAt: expect.any(Date),
        };

        jest.spyOn(orderRepository, 'findOneBy').mockResolvedValue(shippedOrder);
        jest.spyOn(orderRepository, 'save').mockResolvedValue(deliveredOrder);

        const result = await service.confirmDelivery(mockUser, 1);

        expect(result.status).toBe(OrderStatus.DELIVERED);
      });

      it('应该抛出异常当订单状态不是已发货时', async () => {
        const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING_SHIPMENT };

        jest.spyOn(orderRepository, 'findOneBy').mockResolvedValue(pendingOrder);

        await expect(service.confirmDelivery(mockUser, 1)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    it('应该完成完整的订单状态流转: pending → shipped → delivered', async () => {
      const shipDto: ShipOrderDto = { trackingNumber: 'SF1234567890' };
      let currentOrder: ExchangeOrder = { ...mockOrder, status: OrderStatus.PENDING_SHIPMENT };

      jest
        .spyOn(orderRepository, 'findOneBy')
        .mockImplementation(() => Promise.resolve(currentOrder));
      jest.spyOn(orderRepository, 'save').mockImplementation((order) => {
        currentOrder = { ...currentOrder, ...order } as ExchangeOrder;
        return Promise.resolve(currentOrder);
      });

      const shippedResult = await service.shipOrder(1, shipDto);
      expect(shippedResult.status).toBe(OrderStatus.SHIPPED);

      const deliveredResult = await service.confirmDelivery(mockUser, 1);
      expect(deliveredResult.status).toBe(OrderStatus.DELIVERED);
      expect(deliveredResult.trackingNumber).toBe(shipDto.trackingNumber);
    });
  });
});
