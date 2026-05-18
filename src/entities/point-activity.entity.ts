import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BehaviorType } from './point-rule.entity';

export enum ActivityType {
  MULTIPLIER = 'multiplier',
  CHECKIN_REWARD = 'checkin_reward',
}

@Entity('point_activities')
export class PointActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'simple-enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({
    type: 'simple-enum',
    enum: BehaviorType,
    nullable: true,
  })
  behaviorType?: BehaviorType;

  @Column({ default: 1 })
  multiplier: number;

  @Column({ default: 0 })
  consecutiveDays: number;

  @Column({ default: 0 })
  bonusPoints: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  stackable: boolean;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
