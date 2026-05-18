import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PointTransaction } from './point-transaction.entity';
import { ExchangeOrder } from './exchange-order.entity';
import { UserCheckIn } from './user-checkin.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: 0 })
  pointBalance: number;

  @Column({ default: 0 })
  consecutiveCheckinDays: number;

  @Column({ type: 'date', nullable: true })
  lastCheckinDate?: string;

  @OneToMany(() => PointTransaction, (transaction) => transaction.user)
  transactions: PointTransaction[];

  @OneToMany(() => ExchangeOrder, (order) => order.user)
  orders: ExchangeOrder[];

  @OneToMany(() => UserCheckIn, (checkin) => checkin.user)
  checkins: UserCheckIn[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
