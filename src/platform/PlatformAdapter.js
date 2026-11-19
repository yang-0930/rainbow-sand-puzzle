/**
 * 平台适配层：第一版仅提供浏览器环境实现，不含任何平台 SDK 调用。
 * 后续接入 CiDi Games 时，只需替换本文件的实现，核心游戏逻辑无需改动。
 */
export class PlatformAdapter {
  constructor() {
    this.environment = typeof window === 'undefined' ? 'unknown' : 'browser';
    this.listeners = new Set();
  }

  init() {
    return { environment: this.environment, ready: true };
  }

  pause() {
    this.emit('pause');
  }

  resume() {
    this.emit('resume');
  }

  gameOver(result) {
    this.emit('gameover', result);
  }

  on(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(type, payload) {
    for (const callback of this.listeners) callback(type, payload);
  }
}
