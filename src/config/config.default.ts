import { MidwayConfig } from '@midwayjs/core';

export default {
  // use for cookie sign key, should change to your own and keep security
  keys: '1661225977347_6190',
  koa: {
    port: 7001,
  },
  socketIO: {
    path: '/ssh',
  },
} as MidwayConfig;
