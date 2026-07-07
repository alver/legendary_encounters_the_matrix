// SetupScreen.tsx — film + avatar choice + difficulty options. Mirrors the
// original setup modal (setup-modal) and its option checkboxes.

import { useState } from 'react';
import { AVATARS } from '../cards';
import { MOVIE_SETUP } from '../game';
import type { GameOptions, Movie } from '../types';
import { hidePreview, showPreview } from './store';

interface SetupScreenProps {
  open: boolean;
  onStart: (avatarId: string, options: GameOptions, movie: Movie) => void;
}

const MOVIES: Movie[] = ['matrix', 'reloaded', 'revolutions'];

export function SetupScreen({ open, onStart }: SetupScreenProps) {
  const [movie, setMovie] = useState<Movie>('matrix');
  const [chosen, setChosen] = useState<string | null>(null);
  const [prepTurn, setPrepTurn] = useState(false);
  const [dodgeBullets, setDodgeBullets] = useState(false);
  const [systemCards, setSystemCards] = useState(0);
  if (!open) return null;

  const avatars = Object.values(AVATARS).filter(a => !a.hidden && a.movies.includes(movie));

  return (
    <div className="modal-overlay open" id="setup-modal">
      <div className="modal center">
        <h1>Legendary Encounters: The Matrix</h1>
        <p className="subtitle">Solo. Choose your film and your Avatar.</p>
        <div className="movie-tabs" id="movie-tabs">
          {MOVIES.map(m => (
            <button
              key={m}
              className={'movie-tab' + (movie === m ? ' selected' : '')}
              onClick={() => {
                setMovie(m);
                setChosen(null);
              }}
            >
              {MOVIE_SETUP[m].title}
            </button>
          ))}
        </div>
        <div className="card-grid avatars" id="avatar-grid">
          {avatars.map(a => (
            <div
              key={a.id}
              className={'card avatar-pick' + (chosen === a.id ? ' selected' : '')}
              onMouseEnter={() => showPreview(a.image)}
              onMouseLeave={hidePreview}
              onClick={() => setChosen(a.id)}
            >
              <img src={a.image} draggable={false} alt={a.name} />
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
            onClick={() => chosen && onStart(chosen, { prepTurn, dodgeBullets, systemCards }, movie)}
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
