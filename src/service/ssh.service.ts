import { Provide } from '@midwayjs/decorator';
import { IUserOptions } from '../interface';

@Provide()
export class SSHService {
  async getUser(options: IUserOptions) {
    return {
      uid: options.uid,
      username: 'mockedName',
      phone: '12345678901',
      email: 'xxx.xxx@xxx.com',
    };
  }

  async LoginSSH() {
    // TODO: 建立ssh链接
  }
}
