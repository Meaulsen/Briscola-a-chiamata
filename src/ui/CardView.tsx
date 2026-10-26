import { createContext, useContext } from 'react';
import { type Card, RANK_NAMES, RANK_SHORT, SUIT_NAMES, cardName, rankOf, suitOf } from '../engine/cards';

/** Aspetto delle carte: solo testo (valore e seme scritti) o immagini del mazzo piacentino. */
export type CardStyle = 'piacentine' | 'testo';

export const CardStyleContext = createContext<CardStyle>('piacentine');

/** Numero stampato sulla carta piacentina (1 = Asso ... 8 Fante, 9 Cavallo, 10 Re) per indice di valore. */
const PIACENTINE_NUMBER = [1, 3, 10, 9, 8, 7, 6, 5, 4, 2] as const;

export const cardImage = (card: Card): string =>
  `${import.meta.env.BASE_URL}carte/piacentine/${SUIT_NAMES[suitOf(card)].toLowerCase()}-${PIACENTINE_NUMBER[rankOf(card)]}.svg`;

interface Props {
  card: Card;
  trump?: number | null;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  small?: boolean;
}

/** Carta come immagine piacentina oppure solo testo (valore grande, seme sotto), secondo le impostazioni. */
export function CardView({ card, trump, onClick, disabled, highlight, small }: Props) {
  const style = useContext(CardStyleContext);
  const s = suitOf(card);
  const r = rankOf(card);
  const cls = [
    'card',
    `suit-${s}`,
    style === 'piacentine' ? 'img' : '',
    small ? 'small' : '',
    trump === s ? 'trump' : '',
    highlight ? 'highlight' : '',
    onClick && !disabled ? 'playable' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const content =
    style === 'piacentine' ? (
      <img src={cardImage(card)} alt="" draggable={false} />
    ) : (
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
