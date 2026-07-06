// types.ts — shared type definitions for the whole game.
//
// GameState MUST stay plain JSON-serializable data: undo works by
// JSON.stringify/parse snapshots of it (see src/game.ts snapshot/restore).

export type CardClass = 'I' | 'R' | 'S' | 'U' | 'T';
export type CardType =
  'hero' | 'hovercraft' | 'strike' | 'event' | 'enemy' | 'challenge' | 'special';
export type Movie = 'matrix' | 'reloaded' | 'revolutions';

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  group?: string;
  cls?: CardClass | null;
  clsWild?: boolean; // Keymaker '*' icon: choose the class each time it's played
  clsAll?: boolean; // Keymaker rare: counts as all five classes
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
  life?: number; // Oracle-Smith: accumulated damage needed to defeat him
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
  chosenCls?: CardClass; // Keymaker heroes: the class picked for this play
  chosenCls2?: CardClass; // Always Another Way: the second picked class
  flipped?: boolean; // Club Hel Guard: upside down (2⚔) vs right-side up (4⚔)
  scannedTurn?: number; // Mobile Bomb: revealed by a scan → doesn't strike that turn
  buyTimeTurn?: number; // Buy Time: paid off for this turn
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
  movies: Movie[];
  flipTo?: string;
  hidden?: boolean;
}

export interface ActCardDef {
  image: string;
  name: string;
  objective: string;
}

export type Phase = 'setup' | 'startup' | 'matrix' | 'action' | 'strike' | 'cleanup' | 'gameover';
// 'ops' = Operations (Mobil Ave / meeting the Architect): neither Real World
// nor Matrix — no scanning, fighting, recruiting or Coordinating.
export type Rsi = 'real' | 'matrix' | 'ops';

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
  heroesDefeated: number; // player cards defeated this turn (Zee)
  kungfuCZBonus: number;
  gunneryRWBonus: number; // Link's Gunnery: vs the next Real World enemy
  avoidMatrixEnemyStrikes: boolean;
  avoidNextStrikes: number; // I'll Handle Them: avoid the next N Strikes
  avoidAllStrikes: boolean; // You Cannot Stop Him, But I Can
  enemyDebuff: number; // I'll Handle Them: all Enemies -N ⚔ this turn
  skipStrikePhase: boolean;
  noScan: boolean;
  noMatrixMove: boolean; // Stranded: can't enter or leave the Matrix this turn
  drawPenalty: number;
  noMoreStrikes: boolean;
  strikesDrawn: number; // for the Go Up, Over Them strike cap
  smithsFought: number; // Reloaded Smiths: max one fight per turn
  timeMode: 'raise' | 'gain' | null; // Reloaded 3.3: once-per-turn choice
  deckTopGains: number; // Towering Leap: may put a gained Hero on your deck
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
  // — Reloaded —
  henchmenDefeated: number; // 5 defeated → the Merovingian falls
  keymakerInGame: boolean; // the Keymaker group was shuffled into Zion
  powerStationDone: boolean;
  emergencyDone: boolean;
  sourceDeadlineTurn: number | null; // the other Source challenges must be done before this turn
  // — Revolutions —
  merovingianDeal: boolean; // Act 1 Part 2: he can now be fought (5 ⚔)
  diggerDefeated: boolean;
  flyLineDone: boolean;
  baneDefeated: boolean;
  strikeCapUntilTurn: number; // Go Up, Over Them: max one Strike per turn until then
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
  movie: Movie;
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
  backdoors: (CardInstance | null)[]; // Reloaded: Backdoor attached per Row space
  dockEnemies: (CardInstance | null)[]; // Revolutions: Sentinel Swarms squatting Dock spaces
  zionBlocker: CardInstance | null; // Revolutions: the Digger sitting on Zion
  flyLine: { card: CardInstance; pos: number } | null; // Fly the Mechanical Line (0..4 under the Dock)
  oracleSmithDamage: number; // Revolutions finale: damage piled on Oracle-Smith
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
  wildSwing?: boolean; // may discard the first Strike drawn and draw a new one
}

export type MaybePromise<T> = T | Promise<T>;

// Per-card behaviour hooks — see src/scripts.ts header for semantics.
export interface ScriptHooks {
  onPlay?(c: CardInstance): MaybePromise<void>;
  onCombo?(c: CardInstance): MaybePromise<void>;
  sacrifice?(c: CardInstance): MaybePromise<boolean | void>; // return false to cancel
  pending?: Record<string, (p: PendingAction) => MaybePromise<boolean | void>>; // return false to keep
  reveal?(c: CardInstance, where: 'row' | 'cz'): MaybePromise<boolean | void>; // true = consumed
  fightBlock?(c: CardInstance): string | null; // extra "can't fight" reason (checked before kw Unfightable)
  fightCost?(c: CardInstance, base: number): number; // dynamic fight cost
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
