import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PointRuleService } from './point-rule.service';
import { PointRule, BehaviorType } from '../../entities/point-rule.entity';
import { UpdatePointRuleDto } from './dto/update-point-rule.dto';

describe('PointRuleService', () => {
  let service: PointRuleService;
  let repository: Repository<PointRule>;

  const mockPointRules: PointRule[] = [
    {
      id: 1,
      behaviorType: BehaviorType.SIGN_IN,
      behaviorName: '每日签到',
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
      behaviorName: '消费返积分',
      points: 50,
      dailyLimit: 0,
      cooldownSeconds: 0,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointRuleService,
        {
          provide: getRepositoryToken(PointRule),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PointRuleService>(PointRuleService);
    repository = module.get<Repository<PointRule>>(getRepositoryToken(PointRule));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all point rules', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue(mockPointRules);

      const result = await service.findAll();

      expect(result).toEqual(mockPointRules);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findByBehaviorType', () => {
    it('should return the rule when it exists', async () => {
      const rule = mockPointRules[0];
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(rule);

      const result = await service.findByBehaviorType(BehaviorType.SIGN_IN);

      expect(result).toEqual(rule);
      expect(repository.findOneBy).toHaveBeenCalledWith({
        behaviorType: BehaviorType.SIGN_IN,
      });
    });

    it('should throw NotFoundException when rule does not exist', async () => {
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(null);

      await expect(
        service.findByBehaviorType(BehaviorType.REVIEW),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update the rule successfully', async () => {
      const existingRule = mockPointRules[0];
      const updateDto: UpdatePointRuleDto = {
        points: 20,
        dailyLimit: 5,
      };
      const updatedRule = { ...existingRule, ...updateDto };

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(existingRule);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedRule);

      const result = await service.update(BehaviorType.SIGN_IN, updateDto);

      expect(result).toEqual(updatedRule);
      expect(repository.findOneBy).toHaveBeenCalledWith({
        behaviorType: BehaviorType.SIGN_IN,
      });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
    });

    it('should throw NotFoundException when rule does not exist', async () => {
      const updateDto: UpdatePointRuleDto = { points: 20 };
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(null);

      await expect(
        service.update(BehaviorType.REVIEW, updateDto),
      ).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should toggle the enabled status from true to false', async () => {
      const existingRule = { ...mockPointRules[0], enabled: true };
      const toggledRule = { ...existingRule, enabled: false };

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(existingRule);
      jest.spyOn(repository, 'save').mockResolvedValue(toggledRule);

      const result = await service.toggle(BehaviorType.SIGN_IN);

      expect(result.enabled).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('should toggle the enabled status from false to true', async () => {
      const existingRule = { ...mockPointRules[0], enabled: false };
      const toggledRule = { ...existingRule, enabled: true };

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(existingRule);
      jest.spyOn(repository, 'save').mockResolvedValue(toggledRule);

      const result = await service.toggle(BehaviorType.SIGN_IN);

      expect(result.enabled).toBe(true);
    });

    it('should throw NotFoundException when rule does not exist', async () => {
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(null);

      await expect(service.toggle(BehaviorType.REVIEW)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
