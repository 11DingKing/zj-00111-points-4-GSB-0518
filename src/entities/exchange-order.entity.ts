import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { PointProduct } from './point-product.entity';

export enum OrderStatus {
  PENDING_SHIPMENT = 'pending_shipment',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('exchange_orders')
export class ExchangeOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderNo: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  productId: number;

  @ManyToOne(() => PointProduct)
  @JoinColumn({ name: 'productId' })
  product: PointProduct;

  @Column()
  productName: string;

  @Column()
  pointsSpent: number;

  @Column({
    type: 'simple-enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_SHIPMENT,
  })
  status: OrderStatus;

  @Column({ nullable: true })
  trackingNumber?: string;

  @Column({ nullable: true })
  shippedAt?: Date;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @Column({ nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  cancelReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
