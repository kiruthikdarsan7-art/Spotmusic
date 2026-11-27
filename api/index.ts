import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../backend/src/app.module';
import { seedCatalog } from '../backend/src/seed';

/**
 * Vercel Serverless entry point for the SpotMusic backend.
 * Vercel cannot run a long-lived server, so the Nest app is created once per
 * warm function instance and every request is routed through it. The catalog
 * seed runs on cold start (it is idempotent and regenerates any audio file
 * missing from /tmp).
 */

const server = express();
let ready: Promise<typeof server> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins.length) app.enableCors({ origin: origins });

  // Behind a load balancer / CDN the real client IP is needed for rate limiting.
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  await app.init();
  await seedCatalog(app);
  return server;
}

export default async function handler(req: any, res: any) {
  if (!ready) ready = bootstrap();
  const srv = await ready;
  srv(req, res);
}
