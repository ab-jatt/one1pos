import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(limit = 100) {
    const logs = await this.prisma.auditLog.findMany({
      include: {
        user: true,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      user: log.user?.name || 'System',
      action: log.action,
      module: log.module,
      timestamp: log.timestamp.toISOString(),
      details: log.details || '',
    }));
  }

  async create(dto: any) {
    const log = await this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        module: dto.module,
        details: dto.details,
        ipAddress: dto.ipAddress,
      },
      include: {
        user: true,
      },
    });

    return {
      id: log.id,
      user: log.user?.name || 'System',
      action: log.action,
      module: log.module,
      timestamp: log.timestamp.toISOString(),
      details: log.details || '',
    };
  }
}
