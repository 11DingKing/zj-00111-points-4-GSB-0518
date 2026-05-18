import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('user_checkins')
export class UserCheckIn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  userId: number;

  @ManyToOne(() => User, (user) => user.checkins)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'date' })
  @Index()
  checkinDate: string;

  @Column({ default: 0 })
  consecutiveDays: number;

  @Column({ default: 0 })
  pointsEarned: number;

  @Column({ default: 0 })
  bonusPointsEarned: number;

  @CreateDateColumn()
  createdAt: Date;
}
