import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { ResponseMessage } from './common/decorators/response-message.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @ResponseMessage('Server is running')
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
