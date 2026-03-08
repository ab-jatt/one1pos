import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('by-email/:email')
  async getByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get()
  @Roles('OWNER')
  async findAll(@Req() req: any) {
    return this.usersService.findAllByBranch(req.user.branchId);
  }

  @Post()
  @Roles('OWNER')
  async createStaff(@Req() req: any, @Body() dto: { name: string; email: string; password: string; role: string }) {
    return this.usersService.createStaff(dto, req.user.branchId);
  }

  @Patch(':id')
  @Roles('OWNER')
  async updateStaff(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateStaff(id, dto, req.user.branchId);
  }

  @Delete(':id')
  @Roles('OWNER')
  async removeStaff(@Req() req: any, @Param('id') id: string) {
    return this.usersService.removeStaff(id, req.user.branchId);
  }
}
