import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { BehaviorType } from './point-rule.entity';

export enum TransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  REFUND = 'refund',
}

@Entity('point_transactions')
export class PointTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'simple-enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'simple-enum',
    enum: BehaviorType,
    nullable: true,
  })
  behaviorType?: BehaviorType;

  @Column()
  points: number;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  orderId?: number;

  @Column({ default: 0 })
  balanceAfter: number;

  @CreateDateColumn()
  createdAt: Date;
}
