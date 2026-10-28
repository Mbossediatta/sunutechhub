import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthenticatedRequest } from '../common/guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MagicLinkRequestDto } from './dto/magic-link-request.dto.js';
import { MagicLinkVerifyDto } from './dto/magic-link-verify.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('magic-link/request')
  requestMagicLink(@Body() body: MagicLinkRequestDto) {
    return this.auth.requestMagicLink(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('magic-link/verify')
  verifyMagicLink(@Body() body: MagicLinkVerifyDto) {
    return this.auth.verifyMagicLink(body.token);
  }

  @Public()
  @Get('google/url')
  getGoogleAuthorizationUrl(@Query('state') state: string) {
    return this.auth.getGoogleAuthorizationUrl(state);
  }

  @Public()
  @Post('google/callback')
  googleCallback(@Body() body: GoogleAuthDto) {
    return this.auth.loginWithGoogle(body.code);
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getProfile(request.user.id);
  }

  @Patch('me')
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(request.user.id, body);
  }

  @Public()
  @Get('users/:id')
  getPublicProfile(@Param('id') id: string) {
    return this.auth.getPublicProfile(id);
  }
}
