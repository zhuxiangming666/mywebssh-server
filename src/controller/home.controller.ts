import { Controller, Post } from '@midwayjs/decorator';

@Controller('/v1/login')
export class HomeController {
  @Post('/ssh')
  async home(): Promise<string> {
    return 'Hello Midwayjs!';
  }
}
