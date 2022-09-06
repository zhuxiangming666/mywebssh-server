import {
  WSController,
  Inject,
  OnWSMessage,
  OnWSDisConnection,
  Init,
} from '@midwayjs/decorator';
import { Context } from '@midwayjs/socketio';
import { Client } from 'ssh2';
import { EventEmitter } from 'events';
const utf8 = require('utf8');

export interface WindowSize {
  cols: number;
  rows: number;
  w: number;
  h: number;
}

const ClientMessageMap = new Map<string, WindowSize>();

function createNewServer(machineConfig, socket, event: EventEmitter) {
  const ssh = new Client();
  const { msgId, ip, username, password } = machineConfig;
  let loginIng = true; // 是否正在登录
  ssh
    .on('ready', () => {
      // 注册event 事件
      socket.emit(
        msgId,
        '\r\n***' + ip + ' SSH CONNECTION ESTABLISHED ***\r\n'
      );
      ssh.shell((err, stream) => {
        if (err) {
          return socket.emit('login', { status: 0, message: err.message });
        }

        socket.emit('login', { status: 0 });
        loginIng = false;

        socket.on('user_input', data => {
          const {
            rows = 0,
            cols,
            w,
            h,
          } = ClientMessageMap.get(socket.id) || {};
          rows !== 0 &&
            stream.setWindow(
              rows.toString(),
              (cols + 1).toString(),
              h.toString(),
              w.toString()
            );
          stream.write(data);
        });

        event.once(`${msgId}_exit`, () => {
          stream.close();
          socket.emit('exit_server');
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
      socket.emit('exit_server');
    })
    .on('error', err => {
      console.error(err);
      socket.emit(
        msgId,
        '\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n'
      );
      // 当正在登录时
      if (loginIng) socket.emit('login', { status: -1 });
    })
    .connect({
      host: ip,
      port: 22,
      username: username,
      password: password,
    });
}

@WSController()
export class HelloSocketController {
  @Inject()
  ctx: Context;

  event: EventEmitter;

  @Init()
  async() {
    this.event = new EventEmitter();
  }

  @OnWSMessage('login')
  async gotMessage(data) {
    createNewServer(
      {
        ...data,
        msgId: this.ctx.id,
      },
      this.ctx,
      this.event
    );
  }

  @OnWSMessage('resize')
  async resize(data: WindowSize) {
    ClientMessageMap.set(this.ctx.id, data);
    this.ctx.emit('resize');
  }

  @OnWSMessage('exit')
  async exitSSHByTimeOut() {
    ClientMessageMap.delete(this.ctx.id);
    this.event.emit(`${this.ctx.id}_exit`);
  }

  @OnWSDisConnection()
  async discontent() {
    ClientMessageMap.delete(this.ctx.id);
    this.event.emit(`${this.ctx.id}_exit`);
  }
}
