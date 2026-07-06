// Sidebar.tsx — phase banner, objective, scrolling game log and the
// Undo / How to play / Restart buttons. Mirrors renderSidebar.

import { useEffect, useRef } from 'react';
import { ACT_CARDS } from '../cards';
import { getG } from '../game';
import { canUndo, undo } from './store';

const PHASE_NAMES: Record<string, string> = {
  matrix: 'Matrix Phase',
  action: 'Action Phase',
  strike: 'Strike Phase',
  cleanup: 'Cleanup',
  gameover: 'Game Over',
};

interface SidebarProps {
  onHowTo: () => void;
  onRestart: () => void;
}

export function Sidebar({ onHowTo, onRestart }: SidebarProps) {
  const G = getG();
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const act = G ? ACT_CARDS[G.movie][`${G.act}.${G.part}`] : null;
  return (
    <aside id="sidebar">
      <div className="phase-banner" id="phase-banner">
        {G ? `Turn ${G.turnNo} — ${PHASE_NAMES[G.phase] || G.phase}` : 'Setup'}
      </div>
      <div className="objective" id="objective">
        {G && act && (
          <>
            <b>
              Act {G.act} · Part {G.part}
            </b>{' '}
            — {act.objective}
          </>
        )}
      </div>
      <div className="log-head">Game Log</div>
      <div id="log" ref={logRef}>
        {G &&
          G.log.slice(-120).map((l, i) => (
            <div key={i} className={`log-line ${l.cls}`}>
              {l.msg}
            </div>
          ))}
      </div>
      <div className="log-foot">
        <button
          id="btn-undo"
          title="Undo your last action"
          disabled={!G || !canUndo() || G.phase !== 'action'}
          onClick={undo}
        >
          ↩ Undo
        </button>
        <button id="btn-howto" onClick={onHowTo}>
          How to play
        </button>
        <button id="btn-restart" onClick={onRestart}>
          Restart
        </button>
      </div>
    </aside>
  );
}
