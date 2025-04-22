import type { Disposable } from '@axonivy/jsonrpc';
import { ProcessBean, type HdBean } from './generated/client';
import { AnimationSettings } from './jsonrpc';

export class Callback<T, R = void> implements Disposable {
  private callback?: (e: T) => R;

  set(callback: (e: T) => R) {
    this.callback = callback;
  }

  call(e: T) {
    return this.callback?.(e);
  }

  dispose() {
    this.callback = undefined;
  }
}

export interface WebIdeClient {
  onOpenProcessEditor: Callback<ProcessBean, Promise<boolean>>;
  onOpenFormEditor: Callback<HdBean, Promise<boolean>>;
  animationSettings(settings: AnimationSettings): void;

  stop(): void;
}
