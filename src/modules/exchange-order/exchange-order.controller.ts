import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../entities/user.entity';
import { ExchangeOrderService } from './exchange-order.service';
import { ExchangeDto } from './dto/exchange.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ShipOrderDto } from './dto/ship-order.dto';

@ApiTags('兑换订单')
@Controller('exchange-orders')
export class ExchangeOrderController {
  constructor(private readonly exchangeOrderService: ExchangeOrderService) {}

  @Post('exchange')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '兑换商品' })
  exchange(@GetUser() user: User, @Body() exchangeDto: ExchangeDto) {
    return this.exchangeOrderService.exchange(user, exchangeDto);
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的订单' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyOrders(
    @GetUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.exchangeOrderService.getMyOrders(user, page || 1, limit || 20);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有订单（管理员）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAllOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.exchangeOrderService.getAllOrders(page || 1, limit || 20);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取订单详情' })
  getOrderDetail(@GetUser() user: User, @Param('id') id: string) {
    return this.exchangeOrderService.getOrderDetail(user, +id);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消订单' })
  cancelOrder(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() cancelDto: CancelOrderDto,
  ) {
    return this.exchangeOrderService.cancelOrder(user, +id, cancelDto);
  }

  @Post(':id/ship')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '订单发货（管理员）' })
  shipOrder(
    @Param('id') id: string,
    @Body() shipDto: ShipOrderDto,
  ) {
    return this.exchangeOrderService.shipOrder(+id, shipDto);
  }

  @Post(':id/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '确认收货' })
  confirmDelivery(@GetUser() user: User, @Param('id') id: string) {
    return this.exchangeOrderService.confirmDelivery(user, +id);
  }
}
