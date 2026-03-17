import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BranchSettings {
  taxRate: number;
  currency: string;
  language: string;
  storeName: string;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(branchId: string): Promise<BranchSettings> {
    const [branch, settings] = await Promise.all([
      this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { taxRate: true, currency: true, name: true },
      }),
      this.prisma.setting.findMany({
        where: {
          branchId,
          key: { in: ['language'] },
        },
      }),
    ]);

    if (!branch) {
      throw new NotFoundException('Store not found');
    }

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    return {
      taxRate: Number(branch.taxRate),
      currency: branch.currency,
      language: settingsMap.get('language') || 'en',
      storeName: branch.name,
    };
  }

  async updateSettings(
    branchId: string,
    data: {
      taxRate?: number;
      currency?: string;
      language?: string;
      storeName?: string;
    },
  ): Promise<BranchSettings> {
    const updateData: Record<string, unknown> = {};

    if (data.taxRate !== undefined) {
      updateData.taxRate = data.taxRate;
    }
    if (data.currency !== undefined) {
      updateData.currency = data.currency;
    }
    if (data.storeName !== undefined) {
      updateData.name = data.storeName;
    }

    const [branch] = await this.prisma.$transaction([
      this.prisma.branch.update({
        where: { id: branchId },
        data: updateData,
        select: { taxRate: true, currency: true, name: true },
      }),
      ...(data.language !== undefined
        ? [
            this.prisma.setting.upsert({
              where: {
                branchId_key: {
                  branchId,
                  key: 'language',
                },
              },
              update: { value: data.language },
              create: {
                branchId,
                key: 'language',
                value: data.language,
              },
            }),
          ]
        : []),
    ]);

    const settings = await this.prisma.setting.findMany({
      where: {
        branchId,
        key: { in: ['language'] },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    return {
      taxRate: Number(branch.taxRate),
      currency: branch.currency,
      language: settingsMap.get('language') || 'en',
      storeName: branch.name,
    };
  }
}
