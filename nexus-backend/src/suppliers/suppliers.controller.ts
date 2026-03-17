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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.suppliersService.findAll(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.suppliersService.findOne(id, req.user.branchId);
  }

  @Post()
  create(@Body() dto: CreateSupplierDto, @Req() req: any) {
    return this.suppliersService.create(dto, req.user.branchId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Req() req: any) {
    return this.suppliersService.update(id, dto, req.user.branchId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.suppliersService.remove(id, req.user.branchId);
  }
}
