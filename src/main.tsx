import { createRoot } from 'react-dom/client';
import { AVATARS } from './cards';
import { newGame, setUI, startTurn } from './game';
import { App } from './ui/App';
import { UI } from './ui/store';
import './styles/base.css';
import './styles/board.css';
import './styles/cards.css';
import './styles/overlays.css';

setUI(UI);

// ?avatar=AvatarTrinityMatrix — skip the setup screen (testing / quick start)
const auto = new URLSearchParams(location.search).get('avatar');
if (auto && AVATARS[auto] && !AVATARS[auto].hidden) {
  newGame(auto, {});
  void startTurn();
}

createRoot(document.getElementById('root')!).render(<App />);
