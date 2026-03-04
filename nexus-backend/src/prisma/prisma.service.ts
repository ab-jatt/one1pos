import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(maxRetries = 5, delay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Attempting database connection (${attempt}/${maxRetries})...`);
        await this.$connect();
        this.logger.log('✓ Database connection successful');
        return;
      } catch (error) {
        this.logger.warn(
          `✗ Database connection failed (attempt ${attempt}/${maxRetries}): ${error.message}`,
        );
        
        if (attempt === maxRetries) {
          this.logger.error('Failed to connect to database after all retries');
          throw error;
        }
        
        const waitTime = delay * Math.pow(2, attempt - 1);
        this.logger.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
