import { Component, inject, signal } from '@angular/core';
import { CdkDragDrop, CdkDragMove, DragDropModule } from '@angular/cdk/drag-drop';
import { GameService } from './services/game.service';
import { BoardComponent } from './components/board/board.component';
import { ShipComponent } from './components/ship/ship.component';
import type { Ship } from './models/ship.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DragDropModule, BoardComponent, ShipComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly game = inject(GameService);

  range(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  readonly shipAbbr: Record<string, string> = {
    Carrier: 'CAR', Battleship: 'BAT', Cruiser: 'CRU', Submarine: 'SUB', Destroyer: 'DES',
  };

  readonly hoverCells = signal<Array<{ row: number; col: number }>>([]);
  readonly hoverValid = signal(false);

  onDragMoved(event: CdkDragMove<string>, ship: Ship): void {
    const boardEl = document.getElementById('player-board-drop');
    if (!boardEl) {
      this.hoverCells.set([]);
      return;
    }
    const rect = boardEl.getBoundingClientRect();
    const { x, y } = event.pointerPosition;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.hoverCells.set([]);
      return;
    }

    const col = Math.max(0, Math.min(9, Math.floor((x - rect.left) / (rect.width / 10))));
    const row = Math.max(0, Math.min(9, Math.floor((y - rect.top) / (rect.height / 10))));

    this.hoverCells.set(this.game.getPreviewCells(ship.id, row, col));
    this.hoverValid.set(this.game.canPlace(ship.id, row, col));
  }

  onDragEnded(): void {
    this.hoverCells.set([]);
    this.hoverValid.set(false);
  }

  onDockDrop(_event: CdkDragDrop<Ship[]>): void {
    // Ships only transfer dock → board via board's own handler; nothing to do here
  }

  onShipDroppedOnBoard(event: { shipId: string; row: number; col: number }): void {
    this.game.placeShip(event.shipId, event.row, event.col);
    this.hoverCells.set([]);
    this.hoverValid.set(false);
  }
}
