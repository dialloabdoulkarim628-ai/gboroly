import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RbacModule } from './rbac/rbac.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TeamsModule } from './teams/teams.module';
import { PlayersModule } from './players/players.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { MatchesModule } from './matches/matches.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { PublicModule } from './public/public.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { SponsorsModule } from './sponsors/sponsors.module';
import { DataModule } from './data/data.module';
import { StatsModule } from './stats/stats.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RbacModule,
    AuthModule,
    OrganizationsModule,
    TournamentsModule,
    TeamsModule,
    PlayersModule,
    RegistrationsModule,
    MatchesModule,
    SchedulingModule,
    PublicModule,
    RealtimeModule,
    NotificationsModule,
    PaymentsModule,
    SponsorsModule,
    DataModule,
    StatsModule,
    MarketplaceModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
