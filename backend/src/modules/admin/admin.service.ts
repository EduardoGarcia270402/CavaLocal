import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditPublisherService } from '../audit/audit-publisher.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { CreateWineDto, UpdateWineDto } from './dto/wine.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditPublisherService,
  ) {}

  async createWine(dto: CreateWineDto, actor: AuthUser) {
    const wine = await this.prisma.wine.create({ data: dto });
    await this.audit.publish({ entity: 'wine', action: 'CREATE', userId: actor.userId, userEmail: actor.email, data: { after: wine } });
    return wine;
  }

  async updateWine(id: string, dto: UpdateWineDto, actor: AuthUser) {
    const before = await this.prisma.wine.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Vino no encontrado');
    const after = await this.prisma.wine.update({ where: { id }, data: dto });
    await this.audit.publish({ entity: 'wine', action: 'UPDATE', userId: actor.userId, userEmail: actor.email, data: { before, after } });
    return after;
  }

  async deleteWine(id: string, actor: AuthUser) {
    const before = await this.prisma.wine.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Vino no encontrado');
    await this.prisma.wine.delete({ where: { id } });
    await this.audit.publish({ entity: 'wine', action: 'DELETE', userId: actor.userId, userEmail: actor.email, data: { before } });
    return { deleted: true };
  }

  async createStore(dto: CreateStoreDto, actor: AuthUser) {
    const store = await this.prisma.establishment.create({ data: dto });
    await this.audit.publish({ entity: 'store', action: 'CREATE', userId: actor.userId, userEmail: actor.email, data: { after: store } });
    return store;
  }

  async updateStore(id: string, dto: UpdateStoreDto, actor: AuthUser) {
    const before = await this.prisma.establishment.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Tienda no encontrada');
    const after = await this.prisma.establishment.update({ where: { id }, data: dto });
    await this.audit.publish({ entity: 'store', action: 'UPDATE', userId: actor.userId, userEmail: actor.email, data: { before, after } });
    return after;
  }

  async deleteStore(id: string, actor: AuthUser) {
    const before = await this.prisma.establishment.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Tienda no encontrada');
    await this.prisma.establishment.delete({ where: { id } });
    await this.audit.publish({ entity: 'store', action: 'DELETE', userId: actor.userId, userEmail: actor.email, data: { before } });
    return { deleted: true };
  }
}
