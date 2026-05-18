import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointRule, BehaviorType } from '../../entities/point-rule.entity';
import { PointRuleService } from './point-rule.service';
import { UpdatePointRuleDto } from './dto/update-point-rule.dto';

describe('PointRuleService', () => {
  let service: PointRuleService;
  let repository: jest.Mocked<Repository<PointRule>>;

  const mockRule: PointRule = {
    id: 1,
    behaviorType: BehaviorType.SIGN_IN,
    behaviorName: '每日签到',
    points: 10,
    dailyLimit: 1,
    cooldownSeconds: 0,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointRuleService,
        {
          provide: getRepositoryToken(PointRule),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PointRuleService>(PointRuleService);
    repository = module.get(getRepositoryToken(PointRule));
  });

  describe('findAll', () => {
    it('should return an array of point rules', async () => {
      const rules = [mockRule];
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
    it('should return the rule when found', async () => {
      repository.findOneBy.mockResolvedValue(mockRule);

      const result = await service.findByBehaviorType(BehaviorType.SIGN_IN);

      expect(result).toEqual(mockRule);
      expect(repository.findOneBy).toHaveBeenCalledWith({
        behaviorType: BehaviorType.SIGN_IN,
      });
    });

    it('should throw NotFoundException when rule does not exist', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(
        service.findByBehaviorType(BehaviorType.SIGN_IN),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findByBehaviorType(BehaviorType.SIGN_IN),
      ).rejects.toThrow('积分规则不存在');
    });
  });

  describe('update', () => {
    it('should update and return the rule', async () => {
      const updateDto: UpdatePointRuleDto = { points: 20, dailyLimit: 3 };
      const updatedRule = { ...mockRule, ...updateDto };

      repository.findOneBy.mockResolvedValue(mockRule);
      repository.save.mockResolvedValue(updatedRule);

      const result = await service.update(BehaviorType.SIGN_IN, updateDto);

      expect(result).toEqual(updatedRule);
      expect(repository.findOneBy).toHaveBeenCalledWith({
        behaviorType: BehaviorType.SIGN_IN,
      });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ points: 20, dailyLimit: 3 }),
      );
    });

    it('should throw NotFoundException when updating non-existent rule', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(BehaviorType.SIGN_IN, { points: 20 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggle', () => {
    it('should toggle enabled from true to false', async () => {
      const enabledRule = { ...mockRule, enabled: true };
      const toggledRule = { ...mockRule, enabled: false };

      repository.findOneBy.mockResolvedValue(enabledRule);
      repository.save.mockResolvedValue(toggledRule);

      const result = await service.toggle(BehaviorType.SIGN_IN);

      expect(result.enabled).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('should toggle enabled from false to true', async () => {
      const disabledRule = { ...mockRule, enabled: false };
      const toggledRule = { ...mockRule, enabled: true };

      repository.findOneBy.mockResolvedValue(disabledRule);
      repository.save.mockResolvedValue(toggledRule);

      const result = await service.toggle(BehaviorType.SIGN_IN);

      expect(result.enabled).toBe(true);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      );
    });

    it('should throw NotFoundException when toggling non-existent rule', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.toggle(BehaviorType.SIGN_IN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
