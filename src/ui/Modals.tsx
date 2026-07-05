// Modals.tsx — the promise-based engine prompts (pick / choice / show), the
// game-over modal and the how-to-play reference. Same markup / class names as
// the original static modals in index.html.

import { useState } from 'react';
import { getG } from '../game';
import { MX } from '../version';
import type { CardInstance, Pickable, SpacePickItem } from '../types';
import { Card } from './Card';
import { currentModal, type ModalRequest } from './store';

function isSpaceItem(it: Pickable): it is SpacePickItem {
  const sp = it as Partial<SpacePickItem>;
  return sp.spaceIdx != null && !sp.id;
}

function PickModal({ modal }: { modal: ModalRequest & { kind: 'pick' } }) {
  const [chosen, setChosen] = useState<Set<Pickable>>(() => new Set());
  const min = modal.opts.min ?? 1;
  const max = modal.opts.max ?? 1;

  const toggle = (it: Pickable) => {
    setChosen(prev => {
      const next = new Set(prev);
      if (next.has(it)) next.delete(it);
      else if (next.size < max) next.add(it);
      return next;
    });
  };

  return (
    <div className="modal-overlay open" id="pick-modal">
      <div className="modal">
        <h2 id="pick-title">{modal.opts.title || 'Choose'}</h2>
        <p id="pick-prompt">{modal.opts.prompt || ''}</p>
        <div className="card-grid" id="pick-grid">
          {modal.items.map(it => {
            const selected = chosen.has(it);
            if (isSpaceItem(it)) {
              return (
                <div
                  key={it.uid}
                  className={'space-tile actionable' + (selected ? ' selected' : '')}
                  onClick={() => toggle(it)}
                >
                  {MX.ROW_NAMES[it.spaceIdx]} (scan)
                </div>
              );
            }
            const c = it as CardInstance;
            if (modal.opts.facedown) {
              const G = getG();
              const idx = G ? G.matrixRow.findIndex(x => x && x.uid === c.uid) : -1;
              return (
                <div
                  key={c.uid}
                  className={'card back actionable' + (selected ? ' selected' : '')}
                  onClick={() => toggle(it)}
                >
                  <div className="back-inner">?</div>
                  {idx >= 0 && <div className="card-badge">{MX.ROW_NAMES[idx]}</div>}
                </div>
              );
            }
            return (
              <Card
                key={c.uid}
                c={c}
                forceUp
                actionable
                className={selected ? 'selected' : ''}
                onClick={() => toggle(it)}
              />
            );
          })}
        </div>
        <div className="modal-actions">
          <span className="pick-count" id="pick-count">
            {max > 1 ? `${chosen.size} / ${max}` : ''}
          </span>
          <button
            className="primary-btn"
            id="pick-confirm"
            disabled={chosen.size < min || chosen.size > max}
            onClick={() => modal.resolve([...chosen])}
          >
            Confirm
          </button>
          {modal.opts.skippable && (
            <button className="ghost-btn" id="pick-skip" onClick={() => modal.resolve([])}>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceModal({ modal }: { modal: ModalRequest & { kind: 'choice' } }) {
  return (
    <div className="modal-overlay open" id="choice-modal">
      <div className="modal narrow center">
        <h2 id="choice-title">{modal.title}</h2>
        <p id="choice-prompt">{modal.prompt}</p>
        <div className="choice-actions" id="choice-actions">
          {modal.options.map((o, i) => (
            <button key={i} className="primary-btn" onClick={() => modal.resolve(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShowModal({ modal }: { modal: ModalRequest & { kind: 'show' } }) {
  return (
    <div className="modal-overlay open" id="show-modal">
      <div className="modal center">
        <h2 id="show-title">{modal.title}</h2>
        <img id="show-img" src={modal.img} alt={modal.title} />
        <div className="modal-actions">
          <button className="primary-btn" id="show-ok" onClick={() => modal.resolve()}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export function EngineModals() {
  const modal = currentModal();
  if (!modal) return null;
  // key = modal.id: a fresh request gets fresh local state (selection).
  if (modal.kind === 'pick') return <PickModal key={modal.id} modal={modal} />;
  if (modal.kind === 'choice') return <ChoiceModal key={modal.id} modal={modal} />;
  return <ShowModal key={modal.id} modal={modal} />;
}

export function GameOverModal({ onAgain }: { onAgain: () => void }) {
  const G = getG();
  if (!G || !G.gameOver) return null;
  return (
    <div className="modal-overlay open" id="gameover-modal">
      <div className="modal narrow center">
        <h1 id="gameover-title">{G.gameOver.title}</h1>
        <p id="gameover-sub">{G.gameOver.sub}</p>
        <div className="modal-actions">
          <button className="primary-btn" id="gameover-again" onClick={onAgain}>
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}

export function HowToModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" id="howto-modal">
      <div className="modal wide">
        <button id="howto-close" className="modal-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2>How to play (solo quick reference)</h2>
        <div id="howto-body">
          <p>
            <b>Goal:</b> play through all three Acts of <i>The Matrix</i> and win a Major Victory. Lose if your
            damage reaches your health, or the Time Track hits 0, or the Strike deck fully runs out.
          </p>
          <p>
            <b>Turn:</b> ① Matrix Phase — a face-down card enters the Rooftops and pushes everything left (off the
            Subway → the Combat Zone). ② Action Phase — play cards from your hand for ® (Recruit) and ⚔ (Attack). ③
            Strike Phase — each Combat-Zone enemy strikes: <i>you</i> if you're in the Matrix (draw a Strike card =
            damage), the <i>Time Track</i> if you're in the Real World. ④ Cleanup — discard everything, draw 6.
          </p>
          <p>
            <b>Real World:</b> spend ® to recruit from the Dock or a Hovercraft (3®, always Coordinate).
            <br />
            <b>In the Matrix:</b> spend ⚔ to scan face-down spaces (cost printed per space), fight revealed enemies,
            and complete Challenges.
          </p>
          <p>
            <b>Moving:</b> once per turn, free. You can always enter the Matrix. To leave you need a phone: Subway or
            Alley must be a <i>clear</i> space, or pay 3 ® in the Combat Zone (blocked with 3+ cards there).
          </p>
          <p>
            <b>Class combos:</b> a Hero's {'{class}'}: ability works if you played another Hero of that class earlier
            this turn.
          </p>
          <p>
            <b>Solo Coordinate:</b> once per turn you may discard a Coordinate card (⇆ button) to draw a card.
          </p>
          <p>
            <b>Free Your Mind</b> resolves your Avatar's ability for the current Act.
          </p>
          <p>
            <b>Act 1:</b> complete both Challenges (they hide in the Matrix Deck), then gain/have a Hovercraft while
            in the Real World and press <i>Free Neo</i>. <b>Act 2:</b> defeat all 7 Training cards (don't forget the
            Jump), then See the Oracle. <b>Act 3:</b> rescue the captive (7®), defeat Agent Smith (12⚔, Subway or
            Combat Zone), then become The One: raise the Time Track to 10 by paying ⚔ while Evading the Agents with
            ®.
          </p>
        </div>
      </div>
    </div>
  );
}
