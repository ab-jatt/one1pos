import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string, employeeId?: string) {
    const shifts = await this.prisma.shift.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        employee: {
          user: { branchId },
        },
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return shifts.map((shift) => this.formatShift(shift));
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    return this.formatShift(shift);
  }

  async create(dto: any) {
    // Validate employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new BadRequestException(`Employee with ID ${dto.employeeId} not found`);
    }

    // Convert to DateTime objects if strings are provided
    let startTime = dto.startTime;
    let endTime = dto.endTime;

    if (typeof startTime === 'string') {
      startTime = new Date(startTime);
    }
    if (typeof endTime === 'string') {
      endTime = new Date(endTime);
    }

    const shift = await this.prisma.shift.create({
      data: {
        employeeId: dto.employeeId,
        startTime,
        endTime,
        type: dto.type || 'Regular',
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    return this.formatShift(shift);
  }

  async update(id: string, dto: any) {
    await this.findOne(id);

    let startTime = dto.startTime;
    let endTime = dto.endTime;

    if (typeof startTime === 'string') {
      startTime = new Date(startTime);
    }
    if (typeof endTime === 'string') {
      endTime = new Date(endTime);
    }

    const updated = await this.prisma.shift.update({
      where: { id },
      data: {
        startTime,
        endTime,
        type: dto.type,
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    return this.formatShift(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.shift.delete({
      where: { id },
    });

    return { success: true };
  }

  private formatShift(shift: any) {
    const startDate = new Date(shift.startTime);
    const endDate = new Date(shift.endTime);

    return {
      id: shift.id,
      employeeId: shift.employeeId,
      employeeName: shift.employee?.user?.name || 'Unknown',
      date: startDate.toISOString().split('T')[0],
      day: this.getDayName(startDate),
      startTime: startDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      endTime: endDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      type: shift.type,
      duration: this.calculateDuration(startDate, endDate),
    };
  }

  private getDayName(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }

  private calculateDuration(startTime: Date, endTime: Date): string {
    const totalMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60),
    );
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}
