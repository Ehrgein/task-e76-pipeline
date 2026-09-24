import { Module } from "@nestjs/common";
import { AlertsController } from "./alerts.controller";
import { MissingFilesService } from "./missing-files.service";

@Module({
  controllers: [AlertsController],
  providers: [MissingFilesService],
})
export class AlertsModule {}
