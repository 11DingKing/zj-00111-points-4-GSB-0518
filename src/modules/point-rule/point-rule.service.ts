import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointRule, BehaviorType } from '../../entities/point-rule.entity';
import { UpdatePointRuleDto } from './dto/update-point-rule.dto';

@Injectable()
export class PointRuleService {
  constructor(
    @InjectRepository(PointRule)
    private pointRuleRepository: Repository<PointRule>,
  ) {}

  async findAll() {
    return this.pointRuleRepository.find();
  }

  async findByBehaviorType(behaviorType: BehaviorType) {
    const rule = await this.pointRuleRepository.findOneBy({ behaviorType });
    if (!rule) {
      throw new NotFoundException('积分规则不存在');
    }
    return rule;
  }

  async update(behaviorType: BehaviorType, updateDto: UpdatePointRuleDto) {
    const rule = await this.findByBehaviorType(behaviorType);
    Object.assign(rule, updateDto);
    return this.pointRuleRepository.save(rule);
  }

  async toggle(behaviorType: BehaviorType) {
    const rule = await this.findByBehaviorType(behaviorType);
    rule.enabled = !rule.enabled;
    return this.pointRuleRepository.save(rule);
  }
}
