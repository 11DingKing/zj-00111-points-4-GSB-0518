import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PointRuleService } from './point-rule.service';
import { BehaviorType } from '../../entities/point-rule.entity';
import { UpdatePointRuleDto } from './dto/update-point-rule.dto';

@ApiTags('积分规则')
@Controller('point-rules')
export class PointRuleController {
  constructor(private readonly pointRuleService: PointRuleService) {}

  @Get()
  @ApiOperation({ summary: '获取所有积分规则' })
  findAll() {
    return this.pointRuleService.findAll();
  }

  @Get(':behaviorType')
  @ApiOperation({ summary: '获取指定行为的积分规则' })
  @ApiParam({ name: 'behaviorType', enum: BehaviorType })
  findOne(@Param('behaviorType') behaviorType: BehaviorType) {
    return this.pointRuleService.findByBehaviorType(behaviorType);
  }

  @Put(':behaviorType')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新积分规则（管理员）' })
  @ApiParam({ name: 'behaviorType', enum: BehaviorType })
  update(
    @Param('behaviorType') behaviorType: BehaviorType,
    @Body() updateDto: UpdatePointRuleDto,
  ) {
    return this.pointRuleService.update(behaviorType, updateDto);
  }

  @Put(':behaviorType/toggle')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '启用/禁用积分规则（管理员）' })
  @ApiParam({ name: 'behaviorType', enum: BehaviorType })
  toggle(@Param('behaviorType') behaviorType: BehaviorType) {
    return this.pointRuleService.toggle(behaviorType);
  }
}
