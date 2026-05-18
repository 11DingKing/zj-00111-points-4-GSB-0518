import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StatsService } from './stats.service';

@ApiTags('统计数据')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: '积分排行榜' })
  @ApiQuery({ name: 'type', required: false, enum: ['total', 'month'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLeaderboard(
    @Query('type') type?: 'total' | 'month',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.statsService.getLeaderboard(type || 'total', page || 1, limit || 20);
  }

  @Get('overview')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '运营概览（管理员）' })
  getOverview() {
    return this.statsService.getOverview();
  }

  @Get('daily')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '每日积分统计（管理员）' })
  @ApiQuery({ name: 'date', required: false, description: '日期，格式：YYYY-MM-DD' })
  getDailyStats(@Query('date') date?: string) {
    return this.statsService.getDailyStats(date);
  }

  @Get('behavior')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '行为类型统计（管理员）' })
  @ApiQuery({ name: 'date', required: false, description: '日期，格式：YYYY-MM-DD' })
  getBehaviorStats(@Query('date') date?: string) {
    return this.statsService.getBehaviorStats(date);
  }

  @Get('top-products')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '热门兑换商品 Top10（管理员）' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopProducts(@Query('limit') limit?: number) {
    return this.statsService.getTopProducts(limit || 10);
  }
}
