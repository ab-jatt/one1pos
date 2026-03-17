import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Logger,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  private readonly logger = new Logger(EmployeesController.name);

  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.employeesService.findAll(req.user.branchId);
  }

  @Get('payroll/history')
  getPayrollHistory(@Req() req: any) {
    return this.employeesService.getPayrollHistory(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.employeesService.findOne(id, req.user.branchId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    this.logger.log(`Creating employee "${dto.name}" by user ${req.user?.sub} branch ${req.user?.branchId}`);
    return this.employeesService.create(dto, req.user.branchId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    this.logger.log(`Updating employee ${id} by user ${req.user?.sub} branch ${req.user?.branchId}`);
    return this.employeesService.update(id, dto, req.user.branchId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`Deleting employee ${id} by user ${req.user?.sub} branch ${req.user?.branchId}`);
    return this.employeesService.remove(id, req.user.branchId);
  }

  @Post('payroll')
  runPayroll(@Req() req: any) {
    this.logger.log(`Running payroll for branch ${req.user?.branchId} by user ${req.user?.sub}`);
    return this.employeesService.runPayroll(req.user.branchId);
  }
}
