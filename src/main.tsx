import { createRoot } from 'react-dom/client';
import { AVATARS } from './cards';
import { newGame, setUI, startTurn } from './game';
import type { Movie } from './types';
import { App } from './ui/App';
import { UI } from './ui/store';
import './styles/base.css';
import './styles/board.css';
import './styles/cards.css';
import './styles/overlays.css';

setUI(UI);

// ?avatar=AvatarTrinityMatrix&movie=reloaded — skip the setup screen
// (testing / quick start; movie defaults to the avatar's first film)
const params = new URLSearchParams(location.search);
const auto = params.get('avatar');
if (auto && AVATARS[auto] && !AVATARS[auto].hidden) {
  const movieParam = params.get('movie') as Movie | null;
  const movie =
    movieParam && AVATARS[auto].movies.includes(movieParam) ? movieParam : AVATARS[auto].movies[0];
  newGame(auto, {}, movie);
  void startTurn();
}

createRoot(document.getElementById('root')!).render(<App />);
