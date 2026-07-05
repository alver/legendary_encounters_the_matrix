// types.ts — shared type definitions for the whole game.
//
// GameState MUST stay plain JSON-serializable data: undo works by
// JSON.stringify/parse snapshots of it (see src/game.ts snapshot/restore).

export type CardClass = 'I' | 'R' | 'S' | 'U' | 'T';
export type CardType = 'hero' | 'hovercraft' | 'strike' | 'event' | 'enemy' | 'challenge' | 'special';

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  group?: string;
  cls?: CardClass | null;
  recruit: number;
  attack: number;
  cost: number | null;
  kw: string[];
  copies: number;
  image: string;
  text: string;
  damage?: number; // strikes
  descriptor?: string; // 'Human' | 'Program' | 'Training' | 'Machine'
  defeat?: number | null; // ⚔ (or ® when defeatType 'R') to defeat/complete; null = unfightable
  defeatType?: 'R' | 'A';
  evade?: number;
  realWorld?: boolean;
  flipTo?: string;
}

// C() fills the defaults, so input only requires the identity fields.
export type CardDefInput = Pick<CardDef, 'id' | 'name' | 'type'> & Partial<CardDef>;

export interface CardInstance {
  uid: number;
  id: string;
  faceUp: boolean;
  noFightTurn?: number; // "can't be fought this turn" (Security Guard)
}

export interface AvatarDef {
  id: string;
  name: string;
  rank: number;
  speed: number;
  health: number;
  image: string;
  passive: string;
  abilities: Record<number, string>;
  flipTo?: string;
  hidden?: boolean;
}

export interface ActCardDef {
  image: string;
  name: string;
  objective: string;
}

export type Phase = 'setup' | 'startup' | 'matrix' | 'action' | 'strike' | 'cleanup' | 'gameover';
export type Rsi = 'real' | 'matrix';

export interface GameOptions {
  prepTurn?: boolean;
  dodgeBullets?: boolean;
  systemCards?: number;
}

export interface TurnFlags {
  playedClasses: Record<CardClass, number>;
  freeMoveUsed: boolean;
  coordUsed: boolean;
  gainedHovercraft: boolean;
  enemiesDefeated: number;
  kungfuCZBonus: number;
  avoidMatrixEnemyStrikes: boolean;
  skipStrikePhase: boolean;
  noScan: boolean;
  drawPenalty: number;
  noMoreStrikes: boolean;
}

export interface GameFlags {
  deadPhones: Record<number, boolean>;
  dejaVu: number;
  trainingDefeated: number;
  truthDone: boolean;
  rabbitDone: boolean;
  cypherRevealTurn: number | null;
  hesGoneUsed: boolean;
  noCoordUntilTurn: number;
}

export interface PlayerState {
  avatarId: string;
  rsi: Rsi;
  health: number;
  strikes: CardInstance[];
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  inPlay: CardInstance[];
  R: number;
  A: number;
  fymOutOfPlay: boolean;
}

export interface PendingAction {
  cardId: string;
  uid: number;
  key: string;
  label: string;
}

export interface LogLine {
  msg: string;
  cls: string;
  turn: number;
}

export interface GameOverState {
  win: boolean;
  title: string;
  sub: string;
}

export interface GameState {
  options: GameOptions;
  act: number;
  part: number;
  time: number;
  turnNo: number;
  phase: Phase;
  matrixDeck: CardInstance[];
  matrixRow: (CardInstance | null)[];
  combatZone: CardInstance[];
  operations: CardInstance[];
  attached: { building: CardInstance | null };
  realWorldEnemies: CardInstance[];
  defeatedEnemies: CardInstance[];
  discardedCES: CardInstance[];
  strikeDeck: CardInstance[];
  strikeDiscard: CardInstance[];
  zion: CardInstance[];
  dock: (CardInstance | null)[];
  hovercraftStack: CardInstance[];
  defeatedHeroes: CardInstance[];
  pending: PendingAction[];
  flags: GameFlags;
  turn: TurnFlags;
  player: PlayerState;
  log: LogLine[];
  gameOver: GameOverState | null;
  turnEnding: boolean;
}

export interface StrikeOpts {
  source?: CardInstance;
  unavoidable?: boolean;
}

export type MaybePromise<T> = T | Promise<T>;

// Per-card behaviour hooks — see src/scripts.ts header for semantics.
export interface ScriptHooks {
  onPlay?(c: CardInstance): MaybePromise<void>;
  onCombo?(c: CardInstance): MaybePromise<void>;
  sacrifice?(c: CardInstance): MaybePromise<boolean | void>; // return false to cancel
  pending?: Record<string, (p: PendingAction) => MaybePromise<boolean | void>>; // return false to keep
  reveal?(c: CardInstance, where: 'row' | 'cz'): MaybePromise<boolean | void>; // true = consumed
  fight?(c: CardInstance): MaybePromise<void>;
  onDefeat?(c: CardInstance): MaybePromise<void>;
  onComplete?(c: CardInstance): MaybePromise<void>;
  strike?(c: CardInstance): MaybePromise<void>;
  afterStrike?(c: CardInstance, s: CardInstance): MaybePromise<void>;
  noStrike?: boolean;
  endAction?(c: CardInstance): void;
  strikeResolve?(c: CardInstance, opts?: StrikeOpts): MaybePromise<void>;
  canComplete?(c: CardInstance): string | null; // block reason, or null when allowed
}

// Avatar Act abilities, keyed by act number (1..3).
export type AvatarScript = Record<number, () => MaybePromise<void>>;

// UI.pick also receives synthetic non-card items (e.g. scannable spaces),
// so anything with a uid is pickable.
export interface Pickable {
  uid: number | string;
}

export interface SpacePickItem extends Pickable {
  uid: string;
  id: null;
  spaceIdx: number;
}

export interface PickOptions {
  title?: string;
  prompt?: string;
  min?: number;
  max?: number;
  skippable?: boolean;
  facedown?: boolean;
  spaces?: boolean;
}

export interface ChoiceOption<V> {
  label: string;
  value: V;
}

// The seam between the engine and any front end (browser UI, test bot).
export interface UIPort {
  render(): void;
  showCard(imgSrc: string, title?: string): Promise<void>;
  pick<T extends Pickable>(items: T[], opts?: PickOptions): Promise<T[]>;
  chooseOption<V>(title: string, prompt: string, options: ChoiceOption<V>[]): Promise<V>;
  confirmBox(title: string, prompt: string, yes?: string, no?: string): Promise<boolean>;
}
