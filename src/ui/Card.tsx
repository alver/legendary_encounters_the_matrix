// Card.tsx — the card / pile / deck-stack building blocks, mirroring the
// cardEl / pileEl / deckEl factories of the original imperative UI (same
// class names, so the existing CSS applies unchanged).

import { D } from '../game';
import type { CardInstance } from '../types';
import { hidePreview, showPreview } from './store';

export interface CardButton {
  label: string;
  title?: string;
  onClick: () => void;
}

interface CardProps {
  c: CardInstance | null;
  small?: boolean;
  forceUp?: boolean;
  actionable?: boolean;
  dim?: boolean;
  badge?: string | null;
  buttons?: CardButton[] | null;
  onClick?: () => void;
  className?: string;
}

export function Card({ c, small, forceUp, actionable, dim, badge, buttons, onClick, className }: CardProps) {
  const back = c && !c.faceUp && !forceUp;
  const cls = [
    'card',
    small ? 'small' : '',
    back ? 'back' : '',
    actionable ? 'actionable' : '',
    dim ? 'dim' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} onClick={onClick}>
      {back ? (
        <div className="back-inner">
          THE
          <br />
          MATRIX
        </div>
      ) : (
        c && (
          <img
            src={D(c).image}
            alt={D(c).name}
            draggable={false}
            onMouseEnter={() => showPreview(D(c).image)}
            onMouseLeave={hidePreview}
          />
        )
      )}
      {badge && <div className="card-badge">{badge}</div>}
      {buttons && buttons.length > 0 && (
        <div className="card-btns">
          {buttons.map((b, i) => (
            <button
              key={i}
              title={b.title || ''}
              onClick={e => {
                e.stopPropagation();
                b.onClick();
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Pile({ arr }: { arr: CardInstance[] }) {
  if (!arr.length) return <div className="pile empty">—</div>;
  const top = arr[arr.length - 1];
  return (
    <div className="pile">
      <Card c={top} small forceUp />
      <div className="pile-count">{arr.length}</div>
    </div>
  );
}

interface DeckStackProps {
  count: number;
  label?: string;
  topImage?: string | null;
  recruitable?: boolean;
  onClick?: () => void;
}

export function DeckStack({ count, label, topImage, recruitable, onClick }: DeckStackProps) {
  const cls = [
    'card small deck-stack',
    topImage ? '' : 'back',
    count === 0 ? 'empty' : '',
    onClick ? 'actionable' : '',
    recruitable ? 'recruitable' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} onClick={onClick}>
      {count === 0 ? (
        <div className="back-inner">EMPTY</div>
      ) : topImage ? (
        <>
          <img src={topImage} alt="" />
          <div className="pile-count">{count}</div>
        </>
      ) : (
        <>
          <div className="back-inner">{label || ''}</div>
          <div className="pile-count">{count}</div>
        </>
      )}
    </div>
  );
}
