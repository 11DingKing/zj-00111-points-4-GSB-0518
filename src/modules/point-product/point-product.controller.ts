import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PointProductService } from './point-product.service';
import { CreatePointProductDto } from './dto/create-point-product.dto';
import { UpdatePointProductDto } from './dto/update-point-product.dto';

@ApiTags('积分商品')
@Controller('point-products')
export class PointProductController {
  constructor(private readonly pointProductService: PointProductService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建积分商品（管理员）' })
  create(@Body() createDto: CreatePointProductDto) {
    return this.pointProductService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取积分商品列表（用户）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.pointProductService.findAll(page || 1, limit || 20);
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有积分商品（管理员）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAllAdmin(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.pointProductService.findAllAdmin(page || 1, limit || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取积分商品详情' })
  findOne(@Param('id') id: string) {
    return this.pointProductService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新积分商品（管理员）' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePointProductDto) {
    return this.pointProductService.update(+id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除积分商品（管理员）' })
  remove(@Param('id') id: string) {
    return this.pointProductService.remove(+id);
  }

  @Put(':id/toggle')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '启用/禁用积分商品（管理员）' })
  toggle(@Param('id') id: string) {
    return this.pointProductService.toggle(+id);
  }
}
