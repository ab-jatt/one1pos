import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Req() req: any, @Query('limit') limit?: string) {
    return this.auditLogsService.findAll(req.user.branchId, limit ? parseInt(limit, 10) : 100);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.auditLogsService.create(dto, req.user.userId, req.user.branchId);
  }
}
