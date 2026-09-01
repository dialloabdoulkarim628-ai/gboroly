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
  ],
  controllers: [HealthController],
})
export class AppModule {}
