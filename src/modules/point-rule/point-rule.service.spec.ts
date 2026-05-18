import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointRule, BehaviorType } from '../../entities/point-rule.entity';
import { PointRuleService } from './point-rule.service';
import { UpdatePointRuleDto } from './dto/update-point-rule.dto';

const mockPointRuleRepository = () => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn(),
});

describe('PointRuleService', () => {
  let service: PointRuleService;
  let repository: ReturnType<typeof mockPointRuleRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointRuleService,
        {
          provide: getRepositoryToken(PointRule),
          useFactory: mockPointRuleRepository,
        },
      ],
    }).compile();

    service = module.get<PointRuleService>(PointRuleService);
    repository = module.get(getRepositoryToken(PointRule));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all point rules', async () => {
      const rules: PointRule[] = [
        {
          id: 1,
          behaviorType: BehaviorType.SIGN_IN,
          behaviorName: '签到',
          points: 10,
          dailyLimit: 1,
          cooldownSeconds: 0,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          behaviorType: BehaviorType.CONSUME,
          behaviorName: '消费',
          points: 1,
          dailyLimit: 0,
          cooldownSeconds: 0,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      repository.find.mockResolvedValue(rules);

      const result = await service.findAll();
      expect(result).toEqual(rules);
      expect(repository.find).toHaveBeenCalled();
    });

    it('should return empty array when no rules exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();
      expect(result).toEqual([]);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findByBehaviorType', () => {
    it('should return rule when behavior type exists', async () => {
      const rule: PointRule = {
        id: 1,
        behaviorType: BehaviorType.SIGN_IN,
        behaviorName: '签到',
        points: 10,
        dailyLimit: 1,
        cooldownSeconds: 0,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOneBy.mockResolvedValue(rule);

      const result = await service.findByBehaviorType(BehaviorType.SIGN_IN);
      expect(result).toEqual(rule);
      expect(repository.findOneBy).toHaveBeenCalledWith({ behaviorType: BehaviorType.SIGN_IN });
    });

    it('should throw NotFoundException when behavior type does not exist', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.findByBehaviorType(BehaviorType.INVITE)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByBehaviorType(BehaviorType.INVITE)).rejects.toThrow(
        '积分规则不存在',
      );
    });
  });

  describe('update', () => {
    it('should update an existing point rule', async () => {
      const existingRule: PointRule = {
        id: 1,
        behaviorType: BehaviorType.SIGN_IN,
        behaviorName: '签到',
        points: 10,
        dailyLimit: 1,
        cooldownSeconds: 0,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto: UpdatePointRuleDto = {
        points: 20,
        dailyLimit: 3,
      };

      const updatedRule: PointRule = {
        ...existingRule,
        points: 20,
        dailyLimit: 3,
      };

      repository.findOneBy.mockResolvedValue(existingRule);
      repository.save.mockResolvedValue(updatedRule);

      const result = await service.update(BehaviorType.SIGN_IN, updateDto);

      expect(repository.findOneBy).toHaveBeenCalledWith({ behaviorType: BehaviorType.SIGN_IN });
      expect(repository.save).toHaveBeenCalledWith(updatedRule);
      expect(result).toEqual(updatedRule);
      expect(result.points).toBe(20);
      expect(result.dailyLimit).toBe(3);
    });

    it('should throw NotFoundException when updating non-existent rule', async () => {
      repository.findOneBy.mockResolvedValue(null);

      const updateDto: UpdatePointRuleDto = { points: 15 };

      await expect(service.update(BehaviorType.INVITE, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should toggle enabled from true to false', async () => {
      const rule: PointRule = {
        id: 1,
        behaviorType: BehaviorType.SIGN_IN,
        behaviorName: '签到',
        points: 10,
        dailyLimit: 1,
        cooldownSeconds: 0,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const toggledRule: PointRule = { ...rule, enabled: false };

      repository.findOneBy.mockResolvedValue(rule);
      repository.save.mockResolvedValue(toggledRule);

      const result = await service.toggle(BehaviorType.SIGN_IN);
      expect(result.enabled).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(toggledRule);
    });

    it('should toggle enabled from false to true', async () => {
      const rule: PointRule = {
        id: 1,
        behaviorType: BehaviorType.SIGN_IN,
        behaviorName: '签到',
        points: 10,
        dailyLimit: 1,
        cooldownSeconds: 0,
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const toggledRule: PointRule = { ...rule, enabled: true };

      repository.findOneBy.mockResolvedValue(rule);
      repository.save.mockResolvedValue(toggledRule);

      const result = await service.toggle(BehaviorType.SIGN_IN);
      expect(result.enabled).toBe(true);
      expect(repository.save).toHaveBeenCalledWith(toggledRule);
    });

    it('should throw NotFoundException when toggling non-existent rule', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.toggle(BehaviorType.INVITE)).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
