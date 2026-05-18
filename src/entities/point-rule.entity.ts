import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BehaviorType {
  SIGN_IN = 'sign_in',
  CONSUME = 'consume',
  REVIEW = 'review',
  INVITE = 'invite',
}

@Entity('point_rules')
export class PointRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'simple-enum',
    enum: BehaviorType,
    unique: true,
  })
  behaviorType: BehaviorType;

  @Column()
  behaviorName: string;

  @Column()
  points: number;

  @Column({ default: 0 })
  dailyLimit: number;

  @Column({ default: 0 })
  cooldownSeconds: number;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
