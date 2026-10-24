export type Character = 'Barbarian' | 'Knight' | 'Mage' | 'Rogue' | 'Rogue_Hooded';

export type FigureSpec = {
  name: string;
  character: Character;
  clip: string;
  at: number;
  show: string[];
  extra?: { asset: string; hand: 'l' | 'r'; world?: [number, number, number] }[];
  turn?: number;
};

// One render per card that shows a character; `at` is how far into the animation the pose is taken.
// An extra prop with `world` is turned to that orientation (degrees) whatever the pose does to the hand.
export const FIGURES: FigureSpec[] = [
  { name: 'explorer', character: 'Barbarian', clip: '1H_Melee_Attack_Chop', at: 0.2, show: ['1H_Axe'] },
  { name: 'scout', character: 'Rogue', clip: 'Walking_A', at: 0.25, show: ['Knife'] },
  { name: 'trailblazer', character: 'Barbarian', clip: 'Dualwield_Melee_Attack_Chop', at: 0.35, show: ['1H_Axe', '1H_Axe_Offhand'] },
  { name: 'pioneer', character: 'Knight', clip: 'Cheer', at: 0.45, show: ['1H_Sword'] },
  { name: 'giantMachete', character: 'Knight', clip: '2H_Melee_Idle', at: 0.3, show: ['2H_Sword'] },
  { name: 'sailor', character: 'Rogue', clip: 'Idle', at: 0.3, show: [] },
  { name: 'captain', character: 'Rogue_Hooded', clip: 'Interact', at: 0.5, show: [] },
  { name: 'traveler', character: 'Barbarian', clip: 'Use_Item', at: 0.45, show: ['Mug'] },
  { name: 'photographer', character: 'Rogue_Hooded', clip: 'Interact', at: 0.35, show: [] },
  { name: 'journalist', character: 'Knight', clip: 'Interact', at: 0.45, show: [] },
  { name: 'treasureChest', character: 'Rogue', clip: 'PickUp', at: 0.45, show: [] },
  { name: 'millionaire', character: 'Knight', clip: 'Cheer', at: 0.3, show: [] },
  { name: 'jackOfAllTrades', character: 'Rogue_Hooded', clip: 'Walking_B', at: 0.3, show: [], extra: [{ asset: 'staff', hand: 'r', world: [0, 0, -8] }] },
  { name: 'adventurer', character: 'Rogue', clip: 'Jump_Idle', at: 0.5, show: ['Knife'] },
  { name: 'transmitter', character: 'Mage', clip: 'Spellcast_Raise', at: 0.6, show: ['1H_Wand'] },
  { name: 'cartographer', character: 'Rogue_Hooded', clip: 'Interact', at: 0.5, show: [] },
  { name: 'scientist', character: 'Mage', clip: 'Spellcast_Shoot', at: 0.4, show: ['1H_Wand'] },
  { name: 'travelLog', character: 'Knight', clip: 'Sit_Floor_Idle', at: 0.3, show: [], extra: [{ asset: 'spellbook_open', hand: 'l', world: [-30, 0, 0] }] },
  { name: 'native', character: 'Rogue', clip: 'Walking_A', at: 0.6, show: [], extra: [{ asset: 'staff', hand: 'r', world: [0, 0, -8] }] },
];
