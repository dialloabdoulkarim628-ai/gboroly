import { Body, Controller, Get, Headers, Ip, Post } from '@nestjs/common';
import {
  ForgotPasswordSchema,
  LoginSchema,
  RefreshSchema,
  RegisterSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  VerifyPhoneSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
  type VerifyPhoneInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, Public, type AuthUser } from '../common/decorators';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.auth.register(body, { userAgent, ip });
  }

  @Public()
  @Post('login')
  login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginInput,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.auth.login(body, { userAgent, ip });
  }

  @Public()
  @Post('refresh')
  refresh(
    @Body(new ZodValidationPipe(RefreshSchema)) body: RefreshInput,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.auth.refresh(body.refreshToken, { userAgent, ip });
  }

  @Public()
  @Post('logout')
  logout(@Body(new ZodValidationPipe(RefreshSchema)) body: RefreshInput) {
    return this.auth.logout(body.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body(new ZodValidationPipe(ForgotPasswordSchema)) body: ForgotPasswordInput) {
    return this.auth.forgotPassword(body);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body(new ZodValidationPipe(ResetPasswordSchema)) body: ResetPasswordInput) {
    return this.auth.resetPassword(body);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body(new ZodValidationPipe(VerifyEmailSchema)) body: VerifyEmailInput) {
    return this.auth.verifyEmail(body);
  }

  @Public()
  @Post('verify-phone')
  verifyPhone(@Body(new ZodValidationPipe(VerifyPhoneSchema)) body: VerifyPhoneInput) {
    return this.auth.verifyPhone(body);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
