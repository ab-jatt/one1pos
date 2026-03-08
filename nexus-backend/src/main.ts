import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Enable CORS. In Docker/production set CORS_ORIGIN to a comma-separated
  // list of allowed browser origins (e.g. "http://localhost:5173").
  const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://192.168.0.102:3000',
    'http://192.168.0.102:3001',
    'http://192.168.0.102:3002',
    'http://192.168.0.102:8080',
    'http://192.168.0.102:80',
  ];

  app.enableCors({
    origin: [...new Set([...defaultOrigins, ...envOrigins])],
    credentials: true,
  });
  
  // Set global API prefix
  app.setGlobalPrefix('api');
  
  await app.listen(process.env.PORT ?? 4000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 4000}`);
}
bootstrap();
