// store.ts — the seam between the mutable engine state and React.
//
// The engine mutates G in place and calls UI.render(); here that becomes a
// version bump on a tiny external store (useSyncExternalStore), so the React
// tree re-reads G and re-renders — the same "single render path" the original
// imperative UI had. Engine prompts (pick / chooseOption / showCard) park a
// modal request here and return a promise that the modal component resolves.

import { useSyncExternalStore } from 'react';
import { getG, log, restore, snapshot } from '../game';
import type { ChoiceOption, GameState, Pickable, PickOptions, UIPort } from '../types';

/* ─────────── version store ─────────── */
type Listener = () => void;
let version = 0;
const listeners = new Set<Listener>();
function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function notify() {
  version++;
  for (const l of [...listeners]) l();
}
// Subscribe the component tree to engine changes and read the current state.
export function useGame(): GameState | null {
  useSyncExternalStore(subscribe, () => version);
  return getG();
}

/* ─────────── modal requests (promise based) ─────────── */
export type ModalRequest =
  | { kind: 'pick'; id: number; items: Pickable[]; opts: PickOptions; resolve: (sel: Pickable[]) => void }
  | { kind: 'choice'; id: number; title: string; prompt: string; options: ChoiceOption<unknown>[]; resolve: (v: unknown) => void }
  | { kind: 'show'; id: number; img: string; title: string; resolve: () => void };

let modal: ModalRequest | null = null;
let modalId = 0;
export function currentModal(): ModalRequest | null {
  return modal;
}
function settle<T>(fill: (id: number, done: (v: T) => void) => ModalRequest): Promise<T> {
  return new Promise<T>(res => {
    modal = fill(++modalId, v => {
      modal = null;
      notify();
      res(v);
    });
    notify();
  });
}

/* ─────────── hover preview ─────────── */
let preview: string | null = null;
export function currentPreview(): string | null {
  return preview;
}
export function showPreview(src: string) {
  preview = src;
  notify();
}
export function hidePreview() {
  preview = null;
  notify();
}

/* ─────────── guarded action dispatch (with undo snapshot) ─────────── */
let busy = false;
const snapshots: string[] = []; // undo stack (JSON strings)

export async function run(fn: () => void | Promise<void>, { snap = true } = {}) {
  const G = getG();
  if (busy || !G || G.gameOver) {
    if (G && G.gameOver) notify();
    return;
  }
  if (G.phase !== 'action') return;
  busy = true;
  try {
    if (snap) pushSnapshot();
    await fn();
  } finally {
    busy = false;
    notify();
  }
}
function pushSnapshot() {
  snapshots.push(snapshot());
  if (snapshots.length > 40) snapshots.shift();
}
export function undo() {
  const G = getG();
  if (busy || !snapshots.length || !G || G.phase !== 'action' || G.gameOver) return;
  restore(snapshots.pop()!);
  log('↩ Undo.');
  notify();
}
export function canUndo(): boolean {
  return snapshots.length > 0;
}
export function clearSnapshots() {
  snapshots.length = 0;
}

/* ─────────── the UIPort the engine talks to ─────────── */
export const UI: UIPort = {
  render: notify,
  showCard(img, title = '') {
    return settle<void>((id, done) => ({ kind: 'show', id, img, title, resolve: () => done() }));
  },
  pick<T extends Pickable>(items: T[], opts: PickOptions = {}) {
    return settle<T[]>((id, done) => ({
      kind: 'pick',
      id,
      items,
      opts,
      resolve: sel => done(sel as T[]),
    }));
  },
  chooseOption<V>(title: string, prompt: string, options: ChoiceOption<V>[]) {
    return settle<V>((id, done) => ({
      kind: 'choice',
      id,
      title,
      prompt,
      options: options as ChoiceOption<unknown>[],
      resolve: v => done(v as V),
    }));
  },
  confirmBox: (title, prompt, yes = 'Yes', no = 'No') =>
    UI.chooseOption(title, prompt, [
      { label: yes, value: true },
      { label: no, value: false },
    ]),
};
