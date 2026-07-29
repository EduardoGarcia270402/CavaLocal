import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { CreateWineDto, UpdateWineDto } from './dto/wine.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Post('wines') createWine(@Body() dto: CreateWineDto, @CurrentUser() actor: AuthUser) { return this.service.createWine(dto, actor); }
  @Patch('wines/:id') updateWine(@Param('id') id: string, @Body() dto: UpdateWineDto, @CurrentUser() actor: AuthUser) { return this.service.updateWine(id, dto, actor); }
  @Delete('wines/:id') deleteWine(@Param('id') id: string, @CurrentUser() actor: AuthUser) { return this.service.deleteWine(id, actor); }

  @Post('stores') createStore(@Body() dto: CreateStoreDto, @CurrentUser() actor: AuthUser) { return this.service.createStore(dto, actor); }
  @Patch('stores/:id') updateStore(@Param('id') id: string, @Body() dto: UpdateStoreDto, @CurrentUser() actor: AuthUser) { return this.service.updateStore(id, dto, actor); }
  @Delete('stores/:id') deleteStore(@Param('id') id: string, @CurrentUser() actor: AuthUser) { return this.service.deleteStore(id, actor); }
}
