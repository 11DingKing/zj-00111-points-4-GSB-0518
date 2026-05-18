import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

@Entity('point_products')
export class PointProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  pointsRequired: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  perUserLimit: number;

  @Column({ nullable: true })
  activityStartTime?: Date;

  @Column({ nullable: true })
  activityEndTime?: Date;

  @Column({ default: true })
  enabled: boolean;

  @VersionColumn()
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
