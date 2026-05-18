import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { PointActivityService } from './point-activity.service';
import { CreatePointActivityDto } from './dto/create-point-activity.dto';
import { UpdatePointActivityDto } from './dto/update-point-activity.dto';
import { User } from '../../entities/user.entity';
import { BehaviorType } from '../../entities/point-rule.entity';

@ApiTags('积分活动')
@Controller('point-activities')
export class PointActivityController {
  constructor(private readonly pointActivityService: PointActivityService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建积分活动（管理员）' })
  create(@Body() createDto: CreatePointActivityDto) {
    return this.pointActivityService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有活动列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.pointActivityService.findAll(page || 1, limit || 20);
  }

  @Get('active')
  @ApiOperation({ summary: '获取当前生效的活动列表' })
  @ApiQuery({ name: 'behaviorType', required: false, enum: BehaviorType })
  getActiveActivities(@Query('behaviorType') behaviorType?: BehaviorType) {
    return this.pointActivityService.getActiveActivities(behaviorType);
  }

  @Get('upcoming')
  @ApiOperation({ summary: '获取即将开始的活动预告' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '未来多少天内' })
  getUpcomingActivities(@Query('days') days?: number) {
    return this.pointActivityService.getUpcomingActivities(days || 7);
  }

  @Get('checkin/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户签到状态' })
  getUserCheckinStatus(@GetUser() user: User) {
    return this.pointActivityService.getUserCheckinStatus(user);
  }

  @Get('checkin/history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户签到历史' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUserCheckinHistory(
    @GetUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pointActivityService.getUserCheckinHistory(user, page || 1, limit || 30);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取活动详情' })
  findOne(@Param('id') id: string) {
    return this.pointActivityService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新活动（管理员）' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePointActivityDto) {
    return this.pointActivityService.update(+id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除活动（管理员）' })
  remove(@Param('id') id: string) {
    return this.pointActivityService.remove(+id);
  }

  @Put(':id/toggle')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '启用/禁用活动（管理员）' })
  toggle(@Param('id') id: string) {
    return this.pointActivityService.toggle(+id);
  }
}
