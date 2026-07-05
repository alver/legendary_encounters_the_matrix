// PlayerStrip.tsx — avatar block, strikes, real-world enemies, resource
// pools, in-play / hand rows and the action buttons + pending tray.
// Mirrors renderPlayer + renderControls of the original UI.

import {
  D,
  P,
  actCoordinate,
  actEndPhase,
  actFight,
  actFreeNeo,
  actJump,
  actMinorVictory,
  actMove,
  actPending,
  actPlayCard,
  actRaiseTime,
  actSacrifice,
  avatar,
  fightBlockReason,
  getG,
  inMatrix,
  leaveMatrixBlockReason,
  phoneAvailable,
  totalDamage,
} from '../game';
import { MX } from '../version';
import { Card, type CardButton } from './Card';
import { hidePreview, run, showPreview } from './store';

function ActionButtons() {
  const G = getG();
  if (!G || G.phase !== 'action') return <div id="action-buttons" />;

  const buttons: { label: string; onClick: () => void; ghost?: boolean; disabled?: boolean; title?: string }[] = [];
  if (P().rsi === 'real') {
    buttons.push({
      label: 'Enter the Matrix',
      onClick: () => void run(() => actMove()),
      disabled: G.turn.freeMoveUsed,
    });
  } else {
    const free = phoneAvailable() != null;
    const pay = G.combatZone.length < MX.COMBAT_PHONE_BLOCKED_AT && P().R >= MX.COMBAT_PHONE_COST;
    buttons.push({
      label: 'Exit the Matrix',
      onClick: () => void run(() => actMove()),
      disabled: G.turn.freeMoveUsed || !!leaveMatrixBlockReason() || (!free && !pay),
      title:
        leaveMatrixBlockReason() ||
        (free ? 'Through a free phone' : pay ? 'Pay 3 ® (Combat Zone phone)' : 'No phone available'),
    });
  }
  if (G.act === 1 && G.part === 2)
    buttons.push({
      label: '★ Free Neo from the Matrix',
      onClick: () => void run(() => actFreeNeo()),
      disabled:
        P().rsi !== 'real' || !(P().inPlay.some(c => D(c).type === 'hovercraft') || G.turn.gainedHovercraft),
    });
  if (G.attached.building)
    buttons.push({
      label: 'Jump! (Building must be clear)',
      onClick: () => void run(() => actJump()),
      disabled: !inMatrix() || !!G.matrixRow[3],
    });
  if (G.act === 3 && G.part === 2)
    buttons.push({
      label: 'Run — Minor Victory',
      onClick: () => void run(() => actMinorVictory(), { snap: false }),
      ghost: true,
    });
  if (G.act === 3 && G.part === 3 && G.time < 10)
    buttons.push({
      label: `⚡ Raise Time Track to ${G.time + 1} (pay ${G.time + 1}⚔)`,
      onClick: () => void run(() => actRaiseTime()),
      disabled: P().A < G.time + 1,
    });
  buttons.push({
    label: 'End Action Phase ▸',
    onClick: () => void run(() => actEndPhase(), { snap: false }),
    ghost: true,
  });

  return (
    <div id="action-buttons">
      {buttons.map((b, i) => (
        <button
          key={i}
          className={b.ghost ? 'ghost-btn' : 'primary-btn'}
          disabled={!!b.disabled}
          title={b.title}
          onClick={b.onClick}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

export function PlayerStrip() {
  const G = getG();
  return (
    <section id="player-strip">
      <div className="avatar-block">
        <div className="avatar-slot" id="avatar-slot">
          {G && (
            <>
              <img
                src={avatar().image}
                alt={avatar().name}
                onMouseEnter={() => showPreview(avatar().image)}
                onMouseLeave={hidePreview}
              />
              <div className={'hp' + (totalDamage() >= P().health - 3 ? ' danger' : '')}>
                {totalDamage()} / {P().health} dmg
              </div>
            </>
          )}
        </div>
        <div className={'rsi ' + (G ? (inMatrix() ? 'matrix' : 'real') : '')} id="rsi-indicator">
          {G ? (inMatrix() ? 'IN THE MATRIX' : 'REAL WORLD') : '—'}
        </div>
      </div>

      <div className="side-stack">
        <div className="strikes-taken">
          <span className="zone-label">Your Strikes</span>
          <div className="mini-row" id="player-strikes">
            {G && P().strikes.map(s => <Card key={s.uid} c={s} small forceUp badge={`${D(s).damage || 0}`} />)}
          </div>
        </div>
        <div className="rw-enemies">
          <span className="zone-label">Real World Enemies</span>
          <div className="mini-row" id="rw-enemies">
            {G &&
              G.realWorldEnemies.map(c => (
                <Card
                  key={c.uid}
                  c={c}
                  small
                  forceUp
                  actionable={!fightBlockReason(c)}
                  badge={D(c).defeat != null ? `${D(c).defeat}⚔` : null}
                  onClick={() => void run(() => actFight(c.uid))}
                />
              ))}
          </div>
        </div>
      </div>

      <div className="player-main">
        <div className="status-bar" id="status-bar">
          {G && (
            <>
              <span className="stat pool-r">® {P().R}</span>
              <span className="stat pool-a">⚔ {P().A}</span>
              <span className="stat">Training {G.flags.trainingDefeated}/7</span>
            </>
          )}
        </div>
        <div className="in-play-zone">
          <span className="zone-label">In Play</span>
          <div className="hand-row" id="in-play">
            {G &&
              P().inPlay.map(c => {
                const buttons: CardButton[] = [];
                if (D(c).kw.includes('Sacrifice'))
                  buttons.push({ label: 'Sacrifice', onClick: () => void run(() => actSacrifice(c.uid)) });
                return <Card key={c.uid} c={c} small forceUp buttons={buttons.length ? buttons : null} />;
              })}
          </div>
        </div>
        <div className="hand-zone">
          <span className="zone-label">
            Hand{' '}
            <span id="deck-counts">
              {G && ` — deck ${P().deck.length} · discard ${P().discard.length}`}
            </span>
          </span>
          <div className="hand-row" id="hand">
            {G &&
              P().hand.map(c => {
                const buttons: CardButton[] = [];
                if (D(c).kw.includes('Coordinate') && !G.turn.coordUsed && G.turnNo >= G.flags.noCoordUntilTurn)
                  buttons.push({
                    label: '⇆ Coord',
                    title: 'Solo Coordinate: discard to draw a card',
                    onClick: () => void run(() => actCoordinate(c.uid)),
                  });
                return (
                  <Card
                    key={c.uid}
                    c={c}
                    forceUp
                    actionable={G.phase === 'action'}
                    onClick={() => void run(() => actPlayCard(c.uid))}
                    buttons={buttons.length ? buttons : null}
                  />
                );
              })}
          </div>
        </div>
      </div>

      <div className="controls">
        <ActionButtons />
        <div id="pending-tray">
          {G &&
            G.phase === 'action' &&
            G.pending.map((p, i) => (
              <button key={`${p.uid}-${p.key}-${i}`} className="pending-btn" onClick={() => void run(() => actPending(i))}>
                ◈ {p.label}
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
