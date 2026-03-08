import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.employeesService.findAll(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.employeesService.create(dto, req.user.branchId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Post('payroll')
  runPayroll() {
    return this.employeesService.runPayroll();
  }
}
