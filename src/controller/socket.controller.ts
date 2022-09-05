import {
  WSController,
  OnWSConnection,
  Inject,
  OnWSMessage,
} from '@midwayjs/decorator';
import { Context } from '@midwayjs/socketio';
import { Client } from 'ssh2';
const utf8 = require('utf8');

export interface WindowSize {
  cols: number;
  rows: number;
  w: number;
  h: number;
}

const ClientMessageMap = new Map<string, WindowSize>();

function createNewServer(machineConfig, socket) {
  const ssh = new Client();
  const { msgId, ip, username, password } = machineConfig;
  ssh
    .on('ready', () => {
      socket.emit(
        msgId,
        '\r\n***' + ip + ' SSH CONNECTION ESTABLISHED ***\r\n'
      );
      ssh.shell((err, stream) => {
        if (err) {
          return socket.emit(
            msgId,
            '\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n'
          );
        }

        socket.emit('login', { status: 0 });

        socket.on('user_input', data => {
          const {
            rows = 0,
            cols,
            w,
            h,
          } = ClientMessageMap.get(socket.id) || {};
          console.log('[BUTTERFLY][15:25:13]', rows, cols, w, h);
          rows !== 0 &&
            stream.setWindow(
              rows.toString(),
              (cols + 1).toString(),
              // cols.toString(),
              h.toString(),
              w.toString()
            );
          stream.write(data);
        });

        stream
          .on('data', d => {
            socket.emit(msgId, utf8.decode(d.toString('binary')));
          })
          .on('close', () => {
            ssh.end();
          });
      });
    })
    .on('close', () => {
      socket.emit(msgId, '\r\n*** SSH CONNECTION CLOSED ***\r\n');
    })
    .on('error', err => {
      console.log(err);
      socket.emit(
        msgId,
        '\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n'
      );
    })
    .connect({
      host: ip,
      port: 22,
      username: username,
      password: password,
      keepaliveInterval: 3 * 1000, // 毫秒
      keepaliveCountMax: 2,
    });
}

@WSController()
export class HelloSocketController {
  @Inject()
  ctx: Context;

  @OnWSConnection()
  async content() {
    console.log('链接成功');
  }

  @OnWSMessage('login')
  async gotMessage(data) {
    console.log('[BUTTERFLY][17:39:28]', data);
    createNewServer(
      {
        ...data,
        msgId: this.ctx.id,
      },
      this.ctx
    );
  }

  @OnWSMessage('reszie')
  async reszie(data: WindowSize) {
    console.log('[BUTTERFLY][15:00:18]', data);
    ClientMessageMap.set(this.ctx.id, data);
  }
}
