export type Suit = 'machete' | 'paddle' | 'coin';

export type ActionEffect =
  | 'transmitter'
  | 'cartographer'
  | 'scientist'
  | 'travelLog'
  | 'compass'
  | 'native';

export type CardFace =
  | { kind: 'expedition'; suit: Suit; power: number }
  | { kind: 'joker'; power: number }
  | { kind: 'action'; effect: ActionEffect };

export type Supply =
  | { from: 'starterDeck'; copies: number }
  | { from: 'marketBoard'; cost: number }
  | { from: 'reserve'; cost: number };

export type CardType =
  | 'explorer'
  | 'traveler'
  | 'sailor'
  | 'scout'
  | 'trailblazer'
  | 'pioneer'
  | 'giantMachete'
  | 'captain'
  | 'photographer'
  | 'journalist'
  | 'treasureChest'
  | 'millionaire'
  | 'jackOfAllTrades'
  | 'adventurer'
  | 'propPlane'
  | 'transmitter'
  | 'cartographer'
  | 'scientist'
  | 'travelLog'
  | 'compass'
  | 'native';

export type CardDef = {
  type: CardType;
  name: string;
  face: CardFace;
  supply: Supply;
  singleUse: boolean;
};

export const COPIES_PER_MARKET_PILE = 3;

const expedition = (suit: Suit, power: number): CardFace => ({ kind: 'expedition', suit, power });
const joker = (power: number): CardFace => ({ kind: 'joker', power });
const action = (effect: ActionEffect): CardFace => ({ kind: 'action', effect });

export const CARDS: Record<CardType, CardDef> = {
  explorer: { type: 'explorer', name: 'Trailhand', face: expedition('machete', 1), supply: { from: 'starterDeck', copies: 3 }, singleUse: false },
  traveler: { type: 'traveler', name: 'Trader', face: expedition('coin', 1), supply: { from: 'starterDeck', copies: 4 }, singleUse: false },
  sailor: { type: 'sailor', name: 'Boatman', face: expedition('paddle', 1), supply: { from: 'starterDeck', copies: 1 }, singleUse: false },

  scout: { type: 'scout', name: 'Pathfinder', face: expedition('machete', 2), supply: { from: 'marketBoard', cost: 1 }, singleUse: false },
  trailblazer: { type: 'trailblazer', name: 'Machetero', face: expedition('machete', 3), supply: { from: 'marketBoard', cost: 3 }, singleUse: false },
  pioneer: { type: 'pioneer', name: 'Vanguard', face: expedition('machete', 5), supply: { from: 'reserve', cost: 5 }, singleUse: false },
  giantMachete: { type: 'giantMachete', name: 'Great Blade', face: expedition('machete', 6), supply: { from: 'reserve', cost: 3 }, singleUse: true },

  captain: { type: 'captain', name: 'River Pilot', face: expedition('paddle', 3), supply: { from: 'reserve', cost: 2 }, singleUse: false },

  photographer: { type: 'photographer', name: 'Merchant', face: expedition('coin', 2), supply: { from: 'marketBoard', cost: 2 }, singleUse: false },
  journalist: { type: 'journalist', name: 'Banker', face: expedition('coin', 3), supply: { from: 'reserve', cost: 3 }, singleUse: false },
  treasureChest: { type: 'treasureChest', name: 'Gold Cache', face: expedition('coin', 4), supply: { from: 'marketBoard', cost: 3 }, singleUse: true },
  millionaire: { type: 'millionaire', name: 'Patron', face: expedition('coin', 4), supply: { from: 'reserve', cost: 5 }, singleUse: false },

  jackOfAllTrades: { type: 'jackOfAllTrades', name: 'Wanderer', face: joker(1), supply: { from: 'marketBoard', cost: 2 }, singleUse: false },
  adventurer: { type: 'adventurer', name: 'Daredevil', face: joker(2), supply: { from: 'reserve', cost: 4 }, singleUse: false },
  propPlane: { type: 'propPlane', name: 'Airship', face: joker(4), supply: { from: 'reserve', cost: 4 }, singleUse: true },

  transmitter: { type: 'transmitter', name: 'Telegraph', face: action('transmitter'), supply: { from: 'marketBoard', cost: 4 }, singleUse: true },
  cartographer: { type: 'cartographer', name: 'Mapmaker', face: action('cartographer'), supply: { from: 'reserve', cost: 4 }, singleUse: false },
  scientist: { type: 'scientist', name: 'Naturalist', face: action('scientist'), supply: { from: 'reserve', cost: 4 }, singleUse: false },
  travelLog: { type: 'travelLog', name: 'Field Journal', face: action('travelLog'), supply: { from: 'reserve', cost: 3 }, singleUse: true },
  compass: { type: 'compass', name: 'Sextant', face: action('compass'), supply: { from: 'reserve', cost: 2 }, singleUse: true },
  native: { type: 'native', name: 'Local Guide', face: action('native'), supply: { from: 'reserve', cost: 5 }, singleUse: false },
};

export const ALL_CARDS: readonly CardDef[] = Object.values(CARDS);

export const coinPower = (type: CardType): number | null => {
  const face = CARDS[type].face;
  if (face.kind === 'joker' || (face.kind === 'expedition' && face.suit === 'coin')) return face.power;
  return null;
};

export const coinValue = (type: CardType): number => coinPower(type) ?? 0.5;
