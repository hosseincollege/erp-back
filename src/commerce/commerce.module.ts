import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CrmController } from './crm.controller';
import { CrmCustomersService } from './crm-customers.service';

@Module({
  imports: [PrismaModule],
  controllers: [CrmController],
  providers: [CrmCustomersService],
})
export class CommerceModule {}
