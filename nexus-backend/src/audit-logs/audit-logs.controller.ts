import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.auditLogsService.findAll(limit ? parseInt(limit, 10) : 100);
  }

  @Post()
  create(@Body() dto: any) {
    return this.auditLogsService.create(dto);
  }
}
