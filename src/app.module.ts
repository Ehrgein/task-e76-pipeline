import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlertsModule } from './alerts/alerts.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportingModule } from './reporting/reporting.module';
import { StagingModule } from './staging/staging.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IngestionModule,
    StagingModule,
    AlertsModule,
    ReportingModule,
  ],
})
export class AppModule {}
