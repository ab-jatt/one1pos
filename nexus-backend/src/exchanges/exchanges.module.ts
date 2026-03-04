import { Module } from '@nestjs/common';
import { ExchangesService } from './exchanges.service';
import { ExchangesController } from './exchanges.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ExchangesController],
  providers: [ExchangesService, PrismaService],
  exports: [ExchangesService],
})
export class ExchangesModule {}
