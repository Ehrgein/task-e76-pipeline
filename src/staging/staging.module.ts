import { Module } from "@nestjs/common";
import { StagingService } from "./staging.service";

@Module({
  providers: [StagingService],
  exports: [StagingService],
})
export class StagingModule {}
