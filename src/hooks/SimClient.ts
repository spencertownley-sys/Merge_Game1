// Main-thread side of the physics worker: typed postMessage wrapper that keeps the latest
// snapshot and fans out frames to subscribers (the Pixi scene reads at rAF, the HUD store
// picks out the few values it cares about).

import type {
  MainToWorkerMessage,
  SimEvent,
  SimInit,
  Snapshot,
  WorkerToMainMessage,
} from '../engine/types';
import type { PhysicsTuning } from '../config/physics';

export type FrameListener = (snapshot: Snapshot, events: SimEvent[]) => void;

export class SimClient {
  private worker: Worker;
  private listeners = new Set<FrameListener>();
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  latest: Snapshot | null = null;
  onError: ((message: string) => void) | null = null;

  constructor() {
    this.readyPromise = new Promise((res) => (this.resolveReady = res));
    this.worker = new Worker(new URL('../engine/physics.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (ev: MessageEvent<WorkerToMainMessage>) => {
      const msg = ev.data;
      switch (msg.type) {
        case 'ready':
          this.resolveReady();
          break;
        case 'frame':
          this.latest = msg.snapshot;
          for (const l of this.listeners) l(msg.snapshot, msg.events);
          break;
        case 'error':
          console.error('[physics worker]', msg.message);
          this.onError?.(msg.message);
          break;
      }
    };
    this.worker.onerror = (ev) => {
      console.error('[physics worker] crashed', ev);
      this.onError?.(ev.message ?? 'Physics worker crashed');
    };
  }

  private send(msg: MainToWorkerMessage): void {
    this.worker.postMessage(msg);
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  async start(init: SimInit): Promise<void> {
    await this.readyPromise;
    this.latest = null;
    this.send({ type: 'init', init });
  }

  drop(x: number): void {
    this.send({ type: 'drop', x });
  }

  pause(): void {
    this.send({ type: 'pause' });
  }

  resume(): void {
    this.send({ type: 'resume' });
  }

  applyTuning(tuning: Partial<PhysicsTuning>): void {
    this.send({ type: 'tuning', tuning });
  }

  subscribe(listener: FrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.send({ type: 'destroy' });
    this.listeners.clear();
    this.worker.terminate();
  }
}
