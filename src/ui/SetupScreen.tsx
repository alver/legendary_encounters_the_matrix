// SetupScreen.tsx — avatar choice + difficulty options. Mirrors the original
// setup modal (setup-modal) and its option checkboxes.

import { useState } from 'react';
import { AVATARS } from '../cards';
import type { GameOptions } from '../types';
import { hidePreview, showPreview } from './store';

interface SetupScreenProps {
  open: boolean;
  onStart: (avatarId: string, options: GameOptions) => void;
}

export function SetupScreen({ open, onStart }: SetupScreenProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [prepTurn, setPrepTurn] = useState(false);
  const [dodgeBullets, setDodgeBullets] = useState(false);
  const [systemCards, setSystemCards] = useState(0);
  if (!open) return null;

  return (
    <div className="modal-overlay open" id="setup-modal">
      <div className="modal center">
        <h1>Legendary Encounters: The Matrix</h1>
        <p className="subtitle">Solo — the first film. Choose your Avatar.</p>
        <div className="card-grid avatars" id="avatar-grid">
          {Object.values(AVATARS)
            .filter(a => !a.hidden)
            .map(a => (
              <div
                key={a.id}
                className={'card avatar-pick' + (chosen === a.id ? ' selected' : '')}
                onMouseEnter={() => showPreview(a.image)}
                onMouseLeave={hidePreview}
                onClick={() => setChosen(a.id)}
              >
                <img src={a.image} draggable={false} alt={a.name} />
                <div className="av-name">
                  {a.name}
                  <br />
                  <small>
                    ♥{a.health} · spd {a.speed}
                  </small>
                </div>
              </div>
            ))}
        </div>
        <div className="setup-options">
          <label>
            <input
              type="checkbox"
              id="opt-prep"
              checked={prepTurn}
              onChange={e => setPrepTurn(e.target.checked)}
            />{' '}
            Prep turn (easier: skip the first Matrix Phase)
          </label>
          <label>
            <input
              type="checkbox"
              id="opt-bullets"
              checked={dodgeBullets}
              onChange={e => setDodgeBullets(e.target.checked)}
            />{' '}
            "You're telling me I can dodge bullets?" (easier: +Speed health)
          </label>
          <label>
            Part of the System cards per Act:{' '}
            <select
              id="opt-system"
              value={systemCards}
              onChange={e => setSystemCards(parseInt(e.target.value, 10) || 0)}
            >
              <option value="0">0 (solo standard)</option>
              <option value="1">1 (easier)</option>
              <option value="2">2 (easiest)</option>
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button
            className="primary-btn"
            id="setup-start"
            disabled={!chosen}
            onClick={() => chosen && onStart(chosen, { prepTurn, dodgeBullets, systemCards })}
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
