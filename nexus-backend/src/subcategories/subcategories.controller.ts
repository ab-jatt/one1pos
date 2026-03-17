import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

@Controller('subcategories')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Get()
  findAll(@Req() req: any, @Query('categoryId') categoryId?: string) {
    return this.subcategoriesService.findAll(req.user.branchId, categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.subcategoriesService.findOne(id, req.user.branchId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateSubcategoryDto) {
    return this.subcategoriesService.create(dto, req.user.branchId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubcategoryDto,
    @Req() req: any,
  ) {
    return this.subcategoriesService.update(id, dto, req.user.branchId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.subcategoriesService.remove(id, req.user.branchId);
  }
}
