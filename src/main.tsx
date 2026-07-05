import { createRoot } from 'react-dom/client';
import { setUI } from './game';
import { App } from './ui/App';
import { UI } from './ui/store';
import './styles/base.css';
import './styles/board.css';
import './styles/cards.css';
import './styles/overlays.css';

setUI(UI);
createRoot(document.getElementById('root')!).render(<App />);
