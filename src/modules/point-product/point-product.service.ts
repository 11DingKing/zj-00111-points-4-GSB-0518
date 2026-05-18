import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointProduct } from '../../entities/point-product.entity';
import { PointActivityService } from '../point-activity/point-activity.service';
import { CreatePointProductDto } from './dto/create-point-product.dto';
import { UpdatePointProductDto } from './dto/update-point-product.dto';

@Injectable()
export class PointProductService {
  constructor(
    @InjectRepository(PointProduct)
    private pointProductRepository: Repository<PointProduct>,
    private pointActivityService: PointActivityService,
  ) {}

  async create(createDto: CreatePointProductDto) {
    const product = this.pointProductRepository.create(createDto);
    return this.pointProductRepository.save(product);
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.pointProductRepository.findAndCount({
      where: { enabled: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllAdmin(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.pointProductRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const product = await this.pointProductRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    const upcomingActivities = await this.pointActivityService.getUpcomingActivities(7);
    return {
      ...product,
      upcomingActivities,
    };
  }

  async update(id: number, updateDto: UpdatePointProductDto) {
    const product = await this.findOne(id);
    Object.assign(product, updateDto);
    return this.pointProductRepository.save(product);
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    product.enabled = false;
    return this.pointProductRepository.save(product);
  }

  async toggle(id: number) {
    const product = await this.findOne(id);
    product.enabled = !product.enabled;
    return this.pointProductRepository.save(product);
  }
}
