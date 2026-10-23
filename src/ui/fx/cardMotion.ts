import { gsap } from 'gsap';
import type { GameEvent } from '../../engine/actions';

type Shot = { rect: DOMRect; faceDown: boolean; ghost: HTMLElement };
export type CardSnapshot = { cards: Map<number, Shot>; piles: Map<string, DOMRect> };

const FLIGHT = 0.5;
const DRAW_STAGGER = 0.09;

export const snapshotCards = (): CardSnapshot => ({
  cards: new Map(
    [...document.querySelectorAll<HTMLElement>('[data-card]')].map((el) => [
      Number(el.dataset.card),
      { rect: el.getBoundingClientRect(), faceDown: el.dataset.face === 'down', ghost: el.cloneNode(true) as HTMLElement },
    ]),
  ),
  piles: new Map([...document.querySelectorAll<HTMLElement>('[data-pile]')].map((el) => [el.dataset.pile!, el.getBoundingClientRect()])),
});

// FLIP: every card is already at its new place in the DOM; play it back from where it was before the action.
export const animateCards = (before: CardSnapshot, events: GameEvent[], fxLayer: HTMLElement) => {
  const gainedFrom = new Map(events.flatMap((e) => (e.type === 'cardGained' ? [[e.card.id, e.card.type] as const] : [])));
  const drawOrder = events.flatMap((e) => (e.type === 'cardsDrawn' ? e.cards.map((c) => c.id) : []));
  const removed = events.flatMap((e) => (e.type === 'cardsRemoved' ? e.cards.map((c) => c.id) : []));

  let entering = 0;
  for (const el of document.querySelectorAll<HTMLElement>('[data-card]')) {
    const id = Number(el.dataset.card);
    const shot = before.cards.get(id);
    const gainedType = gainedFrom.get(id);
    const from = shot?.rect ?? (gainedType ? before.piles.get(gainedType) : undefined);
    if (!from) {
      gsap.from(el, { opacity: 0, y: 40, duration: 0.35, delay: entering++ * 0.06, ease: 'back.out(1.6)', clearProps: 'opacity,transform' });
      continue;
    }
    const now = el.getBoundingClientRect();
    const dx = from.left - now.left;
    const dy = from.top - now.top;
    const scale = from.width / now.width;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(scale - 1) < 0.01) continue;
    const drawn = drawOrder.indexOf(id);
    const delay = drawn >= 0 ? 0.12 + drawn * DRAW_STAGGER : 0;
    el.classList.add('is-flying');
    gsap.fromTo(
      el,
      { x: dx, y: dy, scale, transformOrigin: '0 0' },
      {
        x: 0,
        y: 0,
        scale: 1,
        duration: gainedType ? 0.7 : FLIGHT,
        delay,
        ease: 'power3.inOut',
        clearProps: 'transform,transformOrigin',
        onComplete: () => el.classList.remove('is-flying'),
      },
    );
    const faceDown = el.dataset.face === 'down';
    const wasFaceDown = shot ? shot.faceDown : false;
    const inner = el.querySelector('.card__inner');
    if (inner && wasFaceDown !== faceDown) {
      gsap.fromTo(
        inner,
        { rotateY: faceDown ? 0 : 180 },
        { rotateY: faceDown ? 180 : 0, duration: 0.4, delay: delay + FLIGHT * 0.35, ease: 'power2.inOut', clearProps: 'transform' },
      );
    }
  }

  for (const id of removed) {
    const shot = before.cards.get(id);
    if (shot) burn(shot, fxLayer);
  }
};

const burn = ({ rect, ghost }: Shot, fxLayer: HTMLElement) => {
  ghost.removeAttribute('data-card');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    zIndex: '300',
  });
  fxLayer.appendChild(ghost);
  gsap
    .timeline({ onComplete: () => ghost.remove() })
    .to(ghost, { x: 3, duration: 0.04, repeat: 5, yoyo: true, ease: 'none' })
    .to(ghost, { filter: 'sepia(1) saturate(3) hue-rotate(-20deg) brightness(1.3)', duration: 0.15 })
    .to(ghost, { y: -60, rotation: -10, scale: 0.7, opacity: 0, filter: 'sepia(1) brightness(0.2) blur(2px)', duration: 0.7, ease: 'power2.in' });
};
