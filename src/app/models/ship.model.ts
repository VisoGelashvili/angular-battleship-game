export type ShipType = 'Carrier' | 'Battleship' | 'Cruiser' | 'Submarine' | 'Destroyer';
export type Orientation = 'horizontal' | 'vertical';

export interface Ship {
  id: string;
  type: ShipType;
  size: number;
  orientation: Orientation;
  row: number | null;
  col: number | null;
  hitCount: number;
  sunk: boolean;
}

export const SHIP_DEFINITIONS: Array<{ type: ShipType; size: number }> = [
  { type: 'Carrier', size: 5 },
  { type: 'Battleship', size: 4 },
  { type: 'Cruiser', size: 3 },
  { type: 'Submarine', size: 3 },
  { type: 'Destroyer', size: 2 },
];
