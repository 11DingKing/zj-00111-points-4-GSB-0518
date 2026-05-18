import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ExchangeOrderService } from './exchange-order.service';
import { ExchangeOrder, OrderStatus } from '../../entities/exchange-order.entity';
import { PointProduct } from '../../entities/point-product.entity';
import { User } from '../../entities/user.entity';
import { PointTransaction, TransactionType } from '../../entities/point-transaction.entity';
import { ExchangeDto } from './dto/exchange.dto';
import { ShipOrderDto } from './dto/ship-order.dto';

const mockOrderRepository = () => ({
  findOneBy: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
});

const mockProductRepository = () => ({
  findOneBy: jest.fn(),
});

const mockUserRepository = () => ({
  findOneBy: jest.fn(),
});

const mockTransactionRepository = () => ({
  save: jest.fn(),
});

const mockDataSource = () => ({
  transaction: jest.fn(),
});

describe('ExchangeOrderService', () => {
  let service: ExchangeOrderService;
  let orderRepository: ReturnType<typeof mockOrderRepository>;
  let productRepository: ReturnType<typeof mockProductRepository>;
  let userRepository: ReturnType<typeof mockUserRepository>;
  let dataSource: ReturnType<typeof mockDataSource>;

  const mockUser = {
    id: 1,
    username: 'testuser',
    password: 'hashed',
    role: 'user',
    pointBalance: 500,
    consecutiveCheckinDays: 0,
  } as User;

  const mockProduct: PointProduct = {
    id: 1,
    name: 'Test Product',
    pointsRequired: 100,
    stock: 10,
    perUserLimit: 0,
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeOrderService,
        { provide: getRepositoryToken(ExchangeOrder), useFactory: mockOrderRepository },
        { provide: getRepositoryToken(PointProduct), useFactory: mockProductRepository },
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        { provide: getRepositoryToken(PointTransaction), useFactory: mockTransactionRepository },
        { provide: DataSource, useFactory: mockDataSource },
      ],
    }).compile();

    service = module.get<ExchangeOrderService>(ExchangeOrderService);
    orderRepository = module.get(getRepositoryToken(ExchangeOrder));
    productRepository = module.get(getRepositoryToken(PointProduct));
    userRepository = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exchange', () => {
    it('should throw BadRequestException when user points are insufficient', async () => {
      const userWithLowPoints: User = { ...mockUser, pointBalance: 50 };
      const product: PointProduct = { ...mockProduct, pointsRequired: 100 };

      productRepository.findOneBy.mockResolvedValue(product);

      await expect(service.exchange(userWithLowPoints, { productId: 1 } as ExchangeDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.exchange(userWithLowPoints, { productId: 1 } as ExchangeDto)).rejects.toThrow(
        '积分不足',
      );
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productRepository.findOneBy.mockResolvedValue(null);

      await expect(service.exchange(mockUser, { productId: 999 } as ExchangeDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.exchange(mockUser, { productId: 999 } as ExchangeDto)).rejects.toThrow(
        '商品不存在或已下架',
      );
    });

    it('should throw BadRequestException when product is disabled', async () => {
      const disabledProduct: PointProduct = { ...mockProduct, enabled: false };
      productRepository.findOneBy.mockResolvedValue(disabledProduct);

      await expect(service.exchange(mockUser, { productId: 1 } as ExchangeDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when product is out of stock', async () => {
      const outOfStockProduct: PointProduct = { ...mockProduct, stock: 0 };
      productRepository.findOneBy.mockResolvedValue(outOfStockProduct);

      await expect(service.exchange(mockUser, { productId: 1 } as ExchangeDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.exchange(mockUser, { productId: 1 } as ExchangeDto)).rejects.toThrow(
        '商品库存不足',
      );
    });

    it('should successfully create order and deduct points', async () => {
      const product: PointProduct = { ...mockProduct, pointsRequired: 100 };
      productRepository.findOneBy.mockResolvedValue(product);

      const mockOrder = {
        id: 1,
        orderNo: 'EX1234567890',
        userId: mockUser.id,
        productId: product.id,
        productName: product.name,
        pointsSpent: 100,
        status: OrderStatus.PENDING_SHIPMENT,
      } as ExchangeOrder;

      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
        create: jest.fn().mockReturnValue(mockOrder),
        save: jest.fn().mockResolvedValue(mockOrder),
        update: jest.fn().mockResolvedValue({}),
      };

      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      const result = await service.exchange(mockUser, { productId: 1 } as ExchangeDto);

      expect(result.order).toEqual(mockOrder);
      expect(result.newBalance).toBe(400);
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('order status flow', () => {
    let mockOrder: ExchangeOrder;

    beforeEach(() => {
      mockOrder = {
        id: 1,
        orderNo: 'EX1234567890',
        userId: mockUser.id,
        productId: 1,
        productName: 'Test Product',
        pointsSpent: 100,
        status: OrderStatus.PENDING_SHIPMENT,
      } as ExchangeOrder;
    });

    describe('shipOrder', () => {
      it('should transition from pending_shipment to shipped', async () => {
        const shippedOrder: ExchangeOrder = {
          ...mockOrder,
          status: OrderStatus.SHIPPED,
          trackingNumber: 'SF123456789',
          shippedAt: new Date(),
        };

        orderRepository.findOneBy.mockResolvedValue(mockOrder);
        orderRepository.save.mockResolvedValue(shippedOrder);

        const result = await service.shipOrder(1, { trackingNumber: 'SF123456789' } as ShipOrderDto);

        expect(result.status).toBe(OrderStatus.SHIPPED);
        expect(result.trackingNumber).toBe('SF123456789');
        expect(orderRepository.save).toHaveBeenCalled();
      });

      it('should throw BadRequestException when order is not in pending_shipment status', async () => {
        const shippedOrder: ExchangeOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
        orderRepository.findOneBy.mockResolvedValue(shippedOrder);

        await expect(service.shipOrder(1, { trackingNumber: 'SF123456789' } as ShipOrderDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.shipOrder(1, { trackingNumber: 'SF123456789' } as ShipOrderDto)).rejects.toThrow(
          '只能发运待发货的订单',
        );
      });

      it('should throw NotFoundException when order does not exist', async () => {
        orderRepository.findOneBy.mockResolvedValue(null);

        await expect(service.shipOrder(999, { trackingNumber: 'SF123456789' } as ShipOrderDto)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.shipOrder(999, { trackingNumber: 'SF123456789' } as ShipOrderDto)).rejects.toThrow(
          '订单不存在',
        );
      });
    });

    describe('confirmDelivery', () => {
      it('should transition from shipped to delivered', async () => {
        const shippedOrder: ExchangeOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
        const deliveredOrder: ExchangeOrder = {
          ...shippedOrder,
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
        };

        orderRepository.findOneBy.mockResolvedValue(shippedOrder);
        orderRepository.save.mockResolvedValue(deliveredOrder);

        const result = await service.confirmDelivery(mockUser, 1);

        expect(result.status).toBe(OrderStatus.DELIVERED);
        expect(orderRepository.save).toHaveBeenCalled();
      });

      it('should throw BadRequestException when order is not shipped', async () => {
        orderRepository.findOneBy.mockResolvedValue(mockOrder);

        await expect(service.confirmDelivery(mockUser, 1)).rejects.toThrow(BadRequestException);
        await expect(service.confirmDelivery(mockUser, 1)).rejects.toThrow(
          '只能确认已发货的订单',
        );
      });

      it('should throw NotFoundException when order does not exist', async () => {
        orderRepository.findOneBy.mockResolvedValue(null);

        await expect(service.confirmDelivery(mockUser, 999)).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when user is not the owner and not admin', async () => {
        const otherUserOrder: ExchangeOrder = { ...mockOrder, userId: 99 };
        orderRepository.findOneBy.mockResolvedValue(otherUserOrder);

        await expect(service.confirmDelivery(mockUser, 1)).rejects.toThrow(ForbiddenException);
        await expect(service.confirmDelivery(mockUser, 1)).rejects.toThrow('无权操作此订单');
      });

      it('should allow admin to confirm delivery', async () => {
        const shippedOrder: ExchangeOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
        const deliveredOrder: ExchangeOrder = {
          ...shippedOrder,
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
        };
        const adminUser: User = { ...mockUser, id: 99, role: 'admin' as any };

        orderRepository.findOneBy.mockResolvedValue(shippedOrder);
        orderRepository.save.mockResolvedValue(deliveredOrder);

        const result = await service.confirmDelivery(adminUser, 1);
        expect(result.status).toBe(OrderStatus.DELIVERED);
      });
    });
  });
});
