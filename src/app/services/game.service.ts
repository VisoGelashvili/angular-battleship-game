import { Injectable, computed, inject, signal } from '@angular/core';
import type { Cell, CellState } from '../models/cell.model';
import type { GamePhase, GameState, Turn } from '../models/game-state.model';
import { SHIP_DEFINITIONS, type Orientation, type Ship } from '../models/ship.model';
import { AudioService } from './audio.service';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly audio = inject(AudioService);
  private readonly _state = signal<GameState>(this.createInitialState());

  readonly phase = computed(() => this._state().phase);
  readonly playerBoard = computed(() => this._state().playerBoard);
  readonly enemyBoard = computed(() => this._state().enemyBoard);
  readonly playerShips = computed(() => this._state().playerShips);
  readonly enemyShips = computed(() => this._state().enemyShips);
  readonly turn = computed(() => this._state().turn);
  readonly winner = computed(() => this._state().winner);
  readonly orientation = computed(() => this._state().orientation);
  readonly isAnimating = computed(() => this._state().isAnimating);
  readonly unplacedShips = computed(() => this._state().playerShips.filter(s => s.row === null));
  readonly allShipsPlaced = computed(() => this._state().playerShips.every(s => s.row !== null));

  private createInitialState(): GameState {
    return {
      phase: 'setup',
      playerBoard: this.createEmptyBoard(),
      enemyBoard: this.createEmptyBoard(),
      playerShips: this.createShips(),
      enemyShips: this.createShips(),
      turn: 'player',
      winner: null,
      orientation: 'horizontal',
      isAnimating: false,
    };
  }

  private createEmptyBoard(): Cell[][] {
    return Array.from({ length: 10 }, (_, row) =>
      Array.from({ length: 10 }, (_, col) => ({
        row,
        col,
        state: 'empty' as CellState,
        shipId: null,
      }))
    );
  }

  private createShips(): Ship[] {
    return SHIP_DEFINITIONS.map((def, i) => ({
      id: `ship-${i}`,
      type: def.type,
      size: def.size,
      orientation: 'horizontal' as Orientation,
      row: null,
      col: null,
      hitCount: 0,
      sunk: false,
    }));
  }

  private getShipCells(ship: Ship): Array<{ row: number; col: number }> {
    if (ship.row === null || ship.col === null) return [];
    return Array.from({ length: ship.size }, (_, i) => ({
      row: ship.orientation === 'vertical' ? ship.row! + i : ship.row!,
      col: ship.orientation === 'horizontal' ? ship.col! + i : ship.col!,
    }));
  }

  private canPlaceOnBoard(
    board: Cell[][],
    shipConfig: { size: number; orientation: Orientation },
    row: number,
    col: number,
    excludeShipId?: string
  ): boolean {
    for (let i = 0; i < shipConfig.size; i++) {
      const r = shipConfig.orientation === 'vertical' ? row + i : row;
      const c = shipConfig.orientation === 'horizontal' ? col + i : col;
      if (r < 0 || r >= 10 || c < 0 || c >= 10) return false;
      if (board[r][c].shipId !== null && board[r][c].shipId !== excludeShipId) return false;
    }
    return true;
  }

  private doRandomPlacement(ships: Ship[]): { board: Cell[][]; ships: Ship[] } {
    const board = this.createEmptyBoard();
    const newShips: Ship[] = ships.map(s => ({ ...s, row: null, col: null, hitCount: 0, sunk: false }));
    const orientations: Orientation[] = ['horizontal', 'vertical'];

    for (const ship of newShips) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 500) {
        attempts++;
        const orientation = orientations[Math.floor(Math.random() * 2)];
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        if (this.canPlaceOnBoard(board, { size: ship.size, orientation }, row, col)) {
          ship.orientation = orientation;
          ship.row = row;
          ship.col = col;
          for (let i = 0; i < ship.size; i++) {
            const r = orientation === 'vertical' ? row + i : row;
            const c = orientation === 'horizontal' ? col + i : col;
            board[r][c] = { row: r, col: c, state: 'ship', shipId: ship.id };
          }
          placed = true;
        }
      }
    }
    return { board, ships: newShips };
  }

  toggleOrientation(): void {
    this._state.update(s => ({
      ...s,
      orientation: s.orientation === 'horizontal' ? 'vertical' : 'horizontal',
    }));
  }

  canPlace(shipId: string, row: number, col: number): boolean {
    const s = this._state();
    const ship = s.playerShips.find(sh => sh.id === shipId);
    if (!ship) return false;
    return this.canPlaceOnBoard(s.playerBoard, { size: ship.size, orientation: s.orientation }, row, col, shipId);
  }

  getPreviewCells(shipId: string, row: number, col: number): Array<{ row: number; col: number }> {
    const s = this._state();
    const ship = s.playerShips.find(sh => sh.id === shipId);
    if (!ship) return [];
    return Array.from({ length: ship.size }, (_, i) => ({
      row: s.orientation === 'vertical' ? row + i : row,
      col: s.orientation === 'horizontal' ? col + i : col,
    })).filter(c => c.row >= 0 && c.row < 10 && c.col >= 0 && c.col < 10);
  }

  placeShip(shipId: string, row: number, col: number): boolean {
    const s = this._state();
    const ship = s.playerShips.find(sh => sh.id === shipId);
    if (!ship) return false;

    const orientation = s.orientation;
    if (!this.canPlaceOnBoard(s.playerBoard, { size: ship.size, orientation }, row, col, shipId)) return false;

    this._state.update(st => {
      const newBoard = st.playerBoard.map(r => r.map(c => ({ ...c })));

      if (ship.row !== null) {
        this.getShipCells(ship).forEach(({ row: r, col: c }) => {
          newBoard[r][c] = { row: r, col: c, state: 'empty', shipId: null };
        });
      }

      for (let i = 0; i < ship.size; i++) {
        const r = orientation === 'vertical' ? row + i : row;
        const c = orientation === 'horizontal' ? col + i : col;
        newBoard[r][c] = { row: r, col: c, state: 'ship', shipId };
      }

      return {
        ...st,
        playerBoard: newBoard,
        playerShips: st.playerShips.map(sh =>
          sh.id === shipId ? { ...sh, orientation, row, col } : sh
        ),
      };
    });
    return true;
  }

  removeShip(shipId: string): void {
    this._state.update(s => {
      const ship = s.playerShips.find(sh => sh.id === shipId);
      if (!ship || ship.row === null) return s;

      const newBoard = s.playerBoard.map(r => r.map(c => ({ ...c })));
      this.getShipCells(ship).forEach(({ row, col }) => {
        newBoard[row][col] = { row, col, state: 'empty', shipId: null };
      });

      return {
        ...s,
        playerBoard: newBoard,
        playerShips: s.playerShips.map(sh =>
          sh.id === shipId ? { ...sh, row: null, col: null } : sh
        ),
      };
    });
  }

  randomPlacement(): void {
    this._state.update(s => {
      const { board, ships } = this.doRandomPlacement(s.playerShips);
      return { ...s, playerBoard: board, playerShips: ships };
    });
  }

  startBattle(): void {
    if (!this.allShipsPlaced()) return;
    this._state.update(s => {
      const { board: enemyBoard, ships: enemyShips } = this.doRandomPlacement(this.createShips());
      return { ...s, phase: 'battle', enemyBoard, enemyShips };
    });
  }

  playerFire(row: number, col: number): void {
    const s = this._state();
    if (s.phase !== 'battle' || s.turn !== 'player' || s.isAnimating) return;

    const cell = s.enemyBoard[row][col];
    if (cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk') return;

    this._state.update(st => {
      const newBoard = st.enemyBoard.map(r => r.map(c => ({ ...c })));
      const newShips = st.enemyShips.map(sh => ({ ...sh }));

      if (cell.shipId) {
        const idx = newShips.findIndex(sh => sh.id === cell.shipId);
        const ship = { ...newShips[idx], hitCount: newShips[idx].hitCount + 1 };
        if (ship.hitCount === ship.size) {
          ship.sunk = true;
          this.getShipCells(ship).forEach(({ row: r, col: c }) => {
            newBoard[r][c] = { ...newBoard[r][c], state: 'sunk' };
          });
        } else {
          newBoard[row][col] = { ...newBoard[row][col], state: 'hit' };
        }
        newShips[idx] = ship;
      } else {
        newBoard[row][col] = { ...newBoard[row][col], state: 'miss' };
      }

      const allSunk = newShips.every(sh => sh.sunk);
      return {
        ...st,
        enemyBoard: newBoard,
        enemyShips: newShips,
        turn: (allSunk ? 'player' : 'computer') as Turn,
        phase: (allSunk ? 'gameover' : 'battle') as GamePhase,
        winner: allSunk ? 'player' : null,
        isAnimating: !allSunk,
      };
    });

    if (this._state().phase === 'gameover') {
      this.audio.playVictory();
    } else {
      setTimeout(() => this.doComputerFire(), 900);
    }
  }

  // ── AI helpers ──────────────────────────────────────────────────

  private isFireable(board: Cell[][], row: number, col: number): boolean {
    if (row < 0 || row >= 10 || col < 0 || col >= 10) return false;
    const s = board[row][col].state;
    return s === 'empty' || s === 'ship';
  }

  private activeHits(board: Cell[][]): Array<{ row: number; col: number }> {
    const hits: Array<{ row: number; col: number }> = [];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (board[r][c].state === 'hit') hits.push({ row: r, col: c });
    return hits;
  }

  /** Target mode: lock onto known hits and extend toward the kill. */
  private targetShot(
    board: Cell[][],
    hits: Array<{ row: number; col: number }>
  ): { row: number; col: number } | null {
    // With 2+ collinear hits, extend along that axis first.
    if (hits.length >= 2) {
      const sameRow = hits.every(h => h.row === hits[0].row);
      const sameCol = hits.every(h => h.col === hits[0].col);

      if (sameRow) {
        const row = hits[0].row;
        const cs = hits.map(h => h.col).sort((a, b) => a - b);
        const cands: Array<{ row: number; col: number }> = [];
        if (this.isFireable(board, row, cs[0] - 1))               cands.push({ row, col: cs[0] - 1 });
        if (this.isFireable(board, row, cs[cs.length - 1] + 1))   cands.push({ row, col: cs[cs.length - 1] + 1 });
        if (cands.length) return cands[Math.floor(Math.random() * cands.length)];
      }

      if (sameCol) {
        const col = hits[0].col;
        const rs = hits.map(h => h.row).sort((a, b) => a - b);
        const cands: Array<{ row: number; col: number }> = [];
        if (this.isFireable(board, rs[0] - 1, col))               cands.push({ row: rs[0] - 1, col });
        if (this.isFireable(board, rs[rs.length - 1] + 1, col))   cands.push({ row: rs[rs.length - 1] + 1, col });
        if (cands.length) return cands[Math.floor(Math.random() * cands.length)];
      }
    }

    // Single hit (or axis exhausted): probe all four neighbours of every hit.
    const cands: Array<{ row: number; col: number }> = [];
    for (const h of hits) {
      for (const n of [
        { row: h.row - 1, col: h.col },
        { row: h.row + 1, col: h.col },
        { row: h.row, col: h.col - 1 },
        { row: h.row, col: h.col + 1 },
      ]) {
        if (this.isFireable(board, n.row, n.col)) cands.push(n);
      }
    }
    return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
  }

  /** Hunt mode: checkerboard parity halves the search space (smallest ship = 2). */
  private huntShot(board: Cell[][]): { row: number; col: number } {
    const parity: Array<{ row: number; col: number }> = [];
    const rest:   Array<{ row: number; col: number }> = [];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (this.isFireable(board, r, c))
          ((r + c) % 2 === 0 ? parity : rest).push({ row: r, col: c });

    const pool = parity.length ? parity : rest;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Computer turn ────────────────────────────────────────────────

  private doComputerFire(): void {
    const s = this._state();
    if (s.phase !== 'battle') return;

    const hits = this.activeHits(s.playerBoard);
    const { row, col } = (hits.length ? this.targetShot(s.playerBoard, hits) : null)
      ?? this.huntShot(s.playerBoard);

    this._state.update(st => {
      const cell = st.playerBoard[row][col];
      const newBoard = st.playerBoard.map(r => r.map(c => ({ ...c })));
      const newShips = st.playerShips.map(sh => ({ ...sh }));

      if (cell.shipId) {
        const idx = newShips.findIndex(sh => sh.id === cell.shipId);
        const ship = { ...newShips[idx], hitCount: newShips[idx].hitCount + 1 };
        if (ship.hitCount === ship.size) {
          ship.sunk = true;
          this.getShipCells(ship).forEach(({ row: r, col: c }) => {
            newBoard[r][c] = { ...newBoard[r][c], state: 'sunk' };
          });
        } else {
          newBoard[row][col] = { ...newBoard[row][col], state: 'hit' };
        }
        newShips[idx] = ship;
      } else {
        newBoard[row][col] = { ...newBoard[row][col], state: 'miss' };
      }

      const allSunk = newShips.every(sh => sh.sunk);
      return {
        ...st,
        playerBoard: newBoard,
        playerShips: newShips,
        turn: 'player' as Turn,
        phase: (allSunk ? 'gameover' : 'battle') as GamePhase,
        winner: allSunk ? 'computer' : null,
        isAnimating: false,
      };
    });

    if (this._state().phase === 'gameover') {
      this.audio.playDefeat();
    }
  }

  resetGame(): void {
    this._state.set(this.createInitialState());
  }
}
