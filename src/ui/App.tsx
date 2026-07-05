// App.tsx — top-level layout and game lifecycle (setup screen, quickstart via
// ?avatar=, restart, game-over). Subscribes to the engine store once; the
// whole tree re-reads G on every engine render, like the original single
// render path.

import { useEffect, useRef, useState } from 'react';
import { AVATARS } from '../cards';
import { newGame, startTurn } from '../game';
import type { GameOptions } from '../types';
import { Board } from './Board';
import { EngineModals, GameOverModal, HowToModal } from './Modals';
import { PlayerStrip } from './PlayerStrip';
import { SetupScreen } from './SetupScreen';
import { Sidebar } from './Sidebar';
import { clearSnapshots, currentPreview, notify, useGame } from './store';

function CardPreview() {
  const src = currentPreview();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const p = ref.current;
      if (!p || p.style.display !== 'block') return;
      const onLeft = e.clientX > window.innerWidth / 2;
      p.style.left = onLeft ? '12px' : 'auto';
      p.style.right = onLeft ? 'auto' : '340px';
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);
  return (
    <div id="card-preview" ref={ref} style={{ display: src ? 'block' : 'none' }}>
      {src && <img src={src} alt="" />}
    </div>
  );
}

export function App() {
  useGame();
  const [setupOpen, setSetupOpen] = useState(false);
  const [howtoOpen, setHowtoOpen] = useState(false);
  const booted = useRef(false);

  function startGame(avatarId: string, options: GameOptions) {
    setSetupOpen(false);
    clearSnapshots();
    newGame(avatarId, options);
    notify();
    void startTurn();
  }

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    // ?avatar=AvatarTrinityMatrix — skip the setup screen (testing / quick start)
    const auto = new URLSearchParams(location.search).get('avatar');
    if (auto && AVATARS[auto] && !AVATARS[auto].hidden) startGame(auto, {});
    else setSetupOpen(true);
  }, []);

  // key remounts SetupScreen so a restart begins with a clean selection.
  return (
    <>
      <div id="layout">
        <Board />
        <PlayerStrip />
        <Sidebar onHowTo={() => setHowtoOpen(true)} onRestart={() => setSetupOpen(true)} />
      </div>
      <CardPreview />
      <EngineModals />
      {!setupOpen && <GameOverModal onAgain={() => setSetupOpen(true)} />}
      <SetupScreen key={setupOpen ? 'open' : 'closed'} open={setupOpen} onStart={startGame} />
      <HowToModal open={howtoOpen} onClose={() => setHowtoOpen(false)} />
    </>
  );
}
