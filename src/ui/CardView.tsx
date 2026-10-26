import { type Card, RANK_NAMES, RANK_SHORT, SUIT_NAMES, cardName, rankOf, suitOf } from '../engine/cards';

interface Props {
  card: Card;
  trump?: number | null;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  small?: boolean;
}

/** Carta rappresentata solo con testo: valore grande, seme sotto, colore per seme. */
export function CardView({ card, trump, onClick, disabled, highlight, small }: Props) {
  const s = suitOf(card);
  const r = rankOf(card);
  const cls = [
    'card',
    `suit-${s}`,
    small ? 'small' : '',
    trump === s ? 'trump' : '',
    highlight ? 'highlight' : '',
    onClick && !disabled ? 'playable' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      <span className="rank">{RANK_SHORT[r]}</span>
      <span className="rank-name">{RANK_NAMES[r]}</span>
      <span className="suit">{SUIT_NAMES[s]}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-label={cardName(card)} title={cardName(card)}>
        {content}
      </button>
    );
  }
  return (
    <span className={cls} aria-label={cardName(card)} title={cardName(card)}>
      {content}
    </span>
  );
}
