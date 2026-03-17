import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Logger } from '@nestjs/common';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
export class ShiftsController {
  private readonly logger = new Logger(ShiftsController.name);

  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  create(@Body() createShiftDto: any, @Req() req: any) {
    this.logger.log(`Creating shift for employee ${createShiftDto.employeeId} by user ${req.user?.sub} branch ${req.user?.branchId}`);
    return this.shiftsService.create(createShiftDto, req.user.branchId);
  }

  @Get()
  findAll(@Req() req: any, @Query('employeeId') employeeId?: string) {
    return this.shiftsService.findAll(req.user.branchId, employeeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.shiftsService.findOne(id, req.user.branchId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShiftDto: any, @Req() req: any) {
    return this.shiftsService.update(id, updateShiftDto, req.user.branchId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.shiftsService.remove(id, req.user.branchId);
  }
}
