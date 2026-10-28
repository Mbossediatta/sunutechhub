import { Module } from '@nestjs/common';
import {
  AdminAttestationsController,
  AttestationsController,
} from './attestations.controller.js';
import { AttestationsService } from './attestations.service.js';

@Module({
  controllers: [AttestationsController, AdminAttestationsController],
  providers: [AttestationsService],
})
export class AttestationsModule {}
