// Board.tsx — the playmat: time track, act card, Matrix Row, combat /
// operations band and the hovercraft / dock / Zion band. Mirrors the
// renderTimeTrack / renderActs / renderRow / renderZones functions of the
// original UI, zone by zone.

import { ACT_CARDS } from '../cards';
import {
  D,
  P,
  actBuyTime,
  actCompleteChallenge,
  actEvade,
  actFight,
  actJump,
  actRecruitDock,
  actRecruitHovercraft,
  actScan,
  avatar,
  canRecruitFromHere,
  effectiveFightCost,
  effectiveRecruitCost,
  fightBlockReason,
  getG,
  inMatrix,
} from '../game';
import { MX } from '../version';
import type { CardInstance } from '../types';
import { Card, DeckStack, Pile, type CardButton } from './Card';
import { hidePreview, run, showPreview } from './store';

function TimeTrack() {
  const G = getG();
  return (
    <aside className="time-track">
      <div className="tt-title">
        TIME
        <br />
        TRACK
      </div>
      <div className="tt-cells" id="tt-cells">
        {G &&
          Array.from({ length: 10 }, (_, k) => 10 - k).map(v => (
            <div
              key={v}
              className={'tt-cell' + (v === G.time ? ' current' : '') + (v <= 3 ? ' danger' : '')}
            >
              {v}
            </div>
          ))}
      </div>
    </aside>
  );
}

function ActZone() {
  const G = getG();
  if (!G) return <div className="zone-body" id="acts-body" />;
  const key = `${G.act}.${G.part}`;
  const a = ACT_CARDS[G.movie][key];
  return (
    <div className="zone-body" id="acts-body">
      <img
        src={a.image}
        className="act-img"
        alt={a.name}
        onMouseEnter={() => showPreview(a.image)}
        onMouseLeave={hidePreview}
      />
    </div>
  );
}

function enemyCardProps(c: CardInstance) {
  const G = getG()!;
  const def = D(c);
  const buttons: CardButton[] = [];
  if (def.evade)
    buttons.push({ label: `Evade ${def.evade}★`, onClick: () => void run(() => actEvade(c.uid)) });
  if (def.kw.includes('BuyTime') && c.buyTimeTurn !== G.turnNo)
    buttons.push({
      label: 'Buy Time 5★',
      title: "Distract this Agent — it won't strike this turn",
      onClick: () => void run(() => actBuyTime(c.uid)),
    });
  let badge = def.defeat != null ? `${effectiveFightCost(c)}⫻` : null;
  if (def.life) badge = `${effectiveFightCost(c)}⫻ · ${G.oracleSmithDamage}/${def.life}`;
  return {
    actionable: !fightBlockReason(c),
    onClick: () => void run(() => actFight(c.uid)),
    badge,
    buttons: buttons.length ? buttons : null,
  };
}

function Watermark({ text }: { text: string }) {
  return (
    <div className="box-watermark" aria-hidden="true">
      {text.split('').map((ch, k) => (
        <span key={k}>{ch === ' ' ? ' ' : ch}</span>
      ))}
    </div>
  );
}

function MatrixRow() {
  const G = getG();
  return (
    <div className="matrix-row" id="matrix-row">
      <Watermark text="MATRIX" />
      {G &&
        [0, 1, 2, 3, 4].map(i => {
          const c = G.matrixRow[i];
          const phoneSpace = MX.PHONE_SPACES.includes(i);
          let cardEl;
          if (c) {
            if (!c.faceUp) {
              const cost = MX.SCAN_COST[i];
              const affordable = P().A >= cost || (!!G.backdoors[i] && P().R >= cost);
              cardEl = (
                <Card
                  c={c}
                  small
                  actionable={inMatrix() && !G.turn.noScan && affordable}
                  onClick={() => void run(() => actScan(i))}
                />
              );
            } else {
              const def = D(c);
              if (def.type === 'enemy') cardEl = <Card c={c} small {...enemyCardProps(c)} />;
              else if (def.type === 'challenge')
                cardEl = (
                  <Card
                    c={c}
                    small
                    actionable
                    onClick={() => void run(() => actCompleteChallenge(c.uid))}
                  />
                );
              else cardEl = <Card c={c} small />;
            }
          } else {
            cardEl = <div className="card small placeholder" />;
          }
          return (
            <div className="row-space" key={i}>
              <div className="space-head">{MX.ROW_NAMES[i]}</div>
              {i === 3 && G.attached.building && (
                <Card
                  c={G.attached.building}
                  small
                  forceUp
                  actionable
                  badge="JUMP"
                  className="attached"
                  onClick={() => void run(() => actJump())}
                />
              )}
              <div className="card-slot">
                {phoneSpace && (
                  <span className={'slot-phone' + (G.flags.deadPhones[i] ? ' dead' : '')}>
                    {G.flags.deadPhones[i] ? '☎✕' : '☎'}
                  </span>
                )}
                {cardEl}
              </div>
              <div className="scan-label">
                Scan {MX.SCAN_COST[i]}⫻
                {G.backdoors[i] && (
                  <span
                    className="phone"
                    title="Backdoor: you may pay ★ instead of ⫻ to scan here"
                  >
                    /★🚪
                  </span>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export function Board() {
  const G = getG();
  const topOfMatrixDeck =
    G && G.matrixDeck.length && G.matrixDeck[G.matrixDeck.length - 1].faceUp
      ? D(G.matrixDeck[G.matrixDeck.length - 1]).image
      : null;
  const canHov =
    !!G && G.phase === 'action' && P().rsi === 'real' && P().R >= 3 && G.hovercraftStack.length > 0;

  return (
    <main id="board">
      <TimeTrack />

      <div className="playmat">
        {/* ── Matrix Row band ── */}
        <section className="band band-matrix">
          <div className="acts">
            <div className="space-head">Act</div>
            <ActZone />
            <div className="scan-label">{'\u00A0'}</div>
          </div>
          <MatrixRow />
          <div className="zone deck-zone">
            <span className="zone-label">Matrix Deck</span>
            <div className="zone-body" id="matrix-deck-body">
              {G && (
                <DeckStack count={G.matrixDeck.length} label="MATRIX" topImage={topOfMatrixDeck} />
              )}
            </div>
          </div>
          <div className="zone pile-zone edge-pile">
            <span className="zone-label">Defeated Enemies</span>
            <div className="zone-body" id="defeated-enemies-body">
              {G && <Pile arr={G.defeatedEnemies} />}
            </div>
          </div>
        </section>

        {/* ── Combat / Operations band ── */}
        <section className="band band-combat">
          <div className="zone matrix-space-zone" id="in-matrix">
            <span className="zone-label">In the Matrix</span>
            <div className="zone-body" id="in-matrix-body">
              {G && inMatrix() ? (
                <div className="standee">
                  👤
                  <br />
                  {avatar().name}
                </div>
              ) : G && P().rsi === 'ops' ? (
                <div className="standee">
                  🚇
                  <br />
                  Operations
                </div>
              ) : (
                <div className="standee empty" />
              )}
            </div>
          </div>
          <div className="zone combat-zone">
            <Watermark text="COMBAT ZONE" />
            <div
              className={
                'cz-phone' +
                (G && G.combatZone.length >= MX.COMBAT_PHONE_BLOCKED_AT ? ' dead' : '')
              }
              id="cz-phone"
            >
              <span className="cz-phone-icon">
                {G && G.combatZone.length >= MX.COMBAT_PHONE_BLOCKED_AT ? '☎✕' : '☎'}
              </span>
              <span className="cz-phone-cost">3★</span>
            </div>
            <div className="zone-body row-body" id="combat-zone-body">
              {G &&
                G.combatZone.map(c => {
                  const def = D(c);
                  if (def.type === 'enemy')
                    return <Card key={c.uid} c={c} small forceUp {...enemyCardProps(c)} />;
                  if (def.type === 'challenge')
                    return (
                      <Card
                        key={c.uid}
                        c={c}
                        small
                        forceUp
                        actionable
                        onClick={() => void run(() => actCompleteChallenge(c.uid))}
                      />
                    );
                  return <Card key={c.uid} c={c} small forceUp />;
                })}
            </div>
          </div>
          <div className="zone operations">
            <span className="zone-label">Operations</span>
            <div className="zone-body row-body" id="operations-body">
              {G &&
                G.operations.map(c => {
                  const def = D(c);
                  return (
                    <Card
                      key={c.uid}
                      c={c}
                      small
                      forceUp
                      actionable={def.type === 'challenge'}
                      badge={
                        def.type === 'challenge' && def.defeat
                          ? `${def.defeat}${def.defeatType === 'R' ? '★' : '⫻'}`
                          : null
                      }
                      onClick={() => void run(() => actCompleteChallenge(c.uid))}
                    />
                  );
                })}
            </div>
          </div>
          <div className="zone deck-zone">
            <span className="zone-label">Strikes</span>
            <div className="zone-body" id="strikes-body">
              {G && <DeckStack count={G.strikeDeck.length} label="STRIKE" />}
            </div>
          </div>
          <div className="zone pile-zone edge-pile">
            <span className="zone-label">Disc. Strikes</span>
            <div className="zone-body" id="discarded-strikes-body">
              {G && <Pile arr={G.strikeDiscard} />}
            </div>
          </div>
        </section>

        {/* ── Hovercraft / Dock / Zion band ── */}
        <section className="band band-dock">
          <div className="zone deck-zone" id="hovercraft">
            <span className="zone-label">
              Hovercraft <small>(3★)</small>
              {G && G.flyLine && (
                <small title="Fly the Mechanical Line: gain or play Hovercrafts in the Real World">
                  {' '}
                  ✈ {G.flyLine.pos + 1}/6
                </small>
              )}
            </span>
            <div className="zone-body" id="hovercraft-body">
              {G && (
                <DeckStack
                  count={G.hovercraftStack.length}
                  label="HOVER"
                  recruitable={canHov}
                  onClick={canHov ? () => void run(() => actRecruitHovercraft()) : undefined}
                />
              )}
            </div>
          </div>
          <div className="dock" id="dock">
            <span className="zone-label dock-label">Dock</span>
            <div className="row-body" id="dock-body">
              {G &&
                G.dock.map((c, i) => {
                  const swarm = G.dockEnemies[i];
                  if (swarm) return <Card key={swarm.uid} c={swarm} small forceUp {...enemyCardProps(swarm)} />;
                  if (!c) return <div key={i} className="card small placeholder" />;
                  const afford =
                    G.phase === 'action' &&
                    canRecruitFromHere(c) &&
                    P().R >= effectiveRecruitCost(c);
                  return (
                    <Card
                      key={c.uid}
                      c={c}
                      small
                      forceUp
                      actionable={afford}
                      dim={!afford}
                      onClick={() => void run(() => actRecruitDock(i))}
                    />
                  );
                })}
            </div>
          </div>
          <div className="zone deck-zone">
            <span className="zone-label">Zion</span>
            <div className="zone-body" id="zion-body">
              {G && G.zionBlocker ? (
                <div className="pile">
                  <Card c={G.zionBlocker} small forceUp {...enemyCardProps(G.zionBlocker)} />
                  <div className="pile-count">{G.zion.length}</div>
                </div>
              ) : (
                G && <DeckStack count={G.zion.length} label="ZION" />
              )}
            </div>
          </div>
          <div className="zone pile-zone edge-pile">
            <span className="zone-label">Defeated Heroes</span>
            <div className="zone-body" id="defeated-heroes-body">
              {G && <Pile arr={G.defeatedHeroes} />}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
