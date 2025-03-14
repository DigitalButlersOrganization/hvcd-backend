import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SignInDto } from './dto/sign-in.dto.js';
import { SendCodeDto } from './dto/send-code.dto.js';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './services/auth.service.js';
import { Response } from 'express';
import { Cookies } from '../shared/decorators/cookie.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    type: SignInDto,
    description: 'Authorization Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Success',
  })
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.verifyAndSignIn(signInDto);

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken };
  }

  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Success',
  })
  async refresh(
    @Cookies('refreshToken') token: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refreshToken(
      token,
      request['user'],
    );

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken };
  }

  @Post('/send-code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({
    type: SendCodeDto,
    description: 'Authorization Request',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Success',
  })
  async sendCode(@Body() sendCodeDto: SendCodeDto) {
    await this.authService.sendCode(sendCodeDto);
  }

  @Post('/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RefreshTokenGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Success',
  })
  async logout(
    @Cookies('refreshToken') token: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(token, request['user']);
    response.clearCookie('refreshToken');
  }
}
