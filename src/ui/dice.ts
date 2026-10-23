export type TurnOrderRoll = { rolls: number[][]; order: number[] };

export const d6 = () => 1 + Math.floor(Math.random() * 6);

// Everyone rolls one die, highest first; players who tie roll again among themselves until they part.
export const rollTurnOrder = (players: number, roll: () => number): TurnOrderRoll => {
  const rolls: number[][] = Array.from({ length: players }, () => []);
  const settle = (group: number[]): number[] => {
    if (group.length === 1) return group;
    for (const player of group) rolls[player]!.push(roll());
    const round = rolls[group[0]!]!.length - 1;
    const byValue = new Map<number, number[]>();
    for (const player of group) {
      const value = rolls[player]![round]!;
      byValue.set(value, [...(byValue.get(value) ?? []), player]);
    }
    return [...byValue.entries()].sort(([a], [b]) => b - a).flatMap(([, tied]) => settle(tied));
  };
  return { rolls, order: settle(Array.from({ length: players }, (_, i) => i)) };
};
