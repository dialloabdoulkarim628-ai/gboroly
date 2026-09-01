import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RecordPaymentSchema, type RecordPaymentInput } from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  ActiveMembership,
  CurrentUser,
  RequirePermissions,
  type AuthUser,
} from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequirePermissions('payment.manage')
  @Post('registrations/:id/payments')
  record(
    @ActiveMembership() m: Membership,
    @CurrentUser() user: AuthUser,
    @Param('id') registrationId: string,
    @Body(new ZodValidationPipe(RecordPaymentSchema)) body: RecordPaymentInput,
  ) {
    return this.payments.recordPayment(m.organizationId, registrationId, user.id, body);
  }

  @RequirePermissions('payment.manage')
  @Get('registrations/:id/payments')
  listForRegistration(@ActiveMembership() m: Membership, @Param('id') registrationId: string) {
    return this.payments.listByRegistration(m.organizationId, registrationId);
  }

  @RequirePermissions('payment.manage')
  @Get('tournaments/:id/payments')
  listForTournament(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.payments.listByTournament(m.organizationId, tournamentId);
  }

  @RequirePermissions('payment.manage')
  @Get('tournaments/:id/payments/summary')
  summary(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.payments.summary(m.organizationId, tournamentId);
  }

  @RequirePermissions('payment.refund')
  @Post('payments/:id/refund')
  refund(@ActiveMembership() m: Membership, @Param('id') paymentId: string) {
    return this.payments.refund(m.organizationId, paymentId);
  }
}
