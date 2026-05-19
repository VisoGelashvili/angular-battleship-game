import type { Cell } from './cell.model';
import type { Orientation, Ship } from './ship.model';

export type GamePhase = 'setup' | 'battle' | 'gameover';
export type Turn = 'player' | 'computer';

export interface GameState {
  phase: GamePhase;
  playerBoard: Cell[][];
  enemyBoard: Cell[][];
  playerShips: Ship[];
  enemyShips: Ship[];
  turn: Turn;
  winner: 'player' | 'computer' | null;
  orientation: Orientation;
  isAnimating: boolean;
}
