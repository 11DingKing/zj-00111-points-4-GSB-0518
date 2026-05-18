import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PointAccountService } from './point-account.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../entities/user.entity';
import { EarnPointsDto } from './dto/earn-points.dto';

@ApiTags('积分账户')
@Controller('point-account')
export class PointAccountController {
  constructor(private readonly pointAccountService: PointAccountService) {}

  @Post('earn')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取积分' })
  earnPoints(@GetUser() user: User, @Body() earnDto: EarnPointsDto) {
    return this.pointAccountService.earnPoints(user, earnDto);
  }

  @Get('balance')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取积分余额' })
  getBalance(@GetUser() user: User) {
    return this.pointAccountService.getBalance(user);
  }

  @Get('transactions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取积分流水' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'behaviorType', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getTransactions(
    @GetUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('behaviorType') behaviorType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.pointAccountService.getTransactions(
      user,
      page || 1,
      limit || 20,
      behaviorType,
      startDate,
      endDate,
    );
  }
}
