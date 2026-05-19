export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface Cell {
  row: number;
  col: number;
  state: CellState;
  shipId: string | null;
}
