import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import type { Cell } from '../../models/cell.model';
import type { Orientation, Ship } from '../../models/ship.model';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [DragDropModule],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent {
  @Input({ required: true }) cells!: Cell[][];
  @Input({ required: true }) ships!: Ship[];
  @Input() mode: 'setup' | 'player' | 'enemy' = 'player';
  @Input() orientation: Orientation = 'horizontal';
  @Input() hoverCells: Array<{ row: number; col: number }> = [];
  @Input() hoverValid = false;
  @Input() boardId = 'board-grid';
  @Input() label = '';

  @Output() shipDropped = new EventEmitter<{ shipId: string; row: number; col: number }>();
  @Output() cellClicked = new EventEmitter<{ row: number; col: number }>();
  @Output() shipRemoved = new EventEmitter<string>();

  readonly rows = Array.from({ length: 10 }, (_, i) => i);
  readonly cols = Array.from({ length: 10 }, (_, i) => i);
  readonly colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  readonly rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  get placedShips(): Ship[] {
    return this.ships.filter(s => s.row !== null);
  }

  getCellClasses(cell: Cell, row: number, col: number): string {
    const classes: string[] = ['cell'];
    const isHover = this.hoverCells.some(c => c.row === row && c.col === col);

    if (isHover) {
      classes.push(this.hoverValid ? 'hover-valid' : 'hover-invalid');
    } else if (this.mode === 'setup') {
      // ships shown as overlays — cells stay as water
    } else if (this.mode === 'enemy') {
      // never reveal ship positions; only show fired results
      if (cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk') {
        classes.push(`state-${cell.state}`);
      }
    } else {
      classes.push(`state-${cell.state}`);
    }

    if (this.mode === 'enemy' && (cell.state === 'empty' || cell.state === 'ship')) {
      classes.push('clickable');
    }

    return classes.join(' ');
  }

  onCellClick(row: number, col: number): void {
    if (this.mode === 'enemy') {
      const cell = this.cells[row][col];
      if (cell.state === 'empty' || cell.state === 'ship') {
        this.cellClicked.emit({ row, col });
      }
    }
    if (this.mode === 'setup') {
      const cell = this.cells[row][col];
      if (cell.shipId) this.shipRemoved.emit(cell.shipId);
    }
  }

  onBoardDrop(event: CdkDragDrop<string>): void {
    if (event.previousContainer.id !== 'ship-dock') return;
    const shipId = event.item.data as string;
    const nativeEvent = event.event as MouseEvent;
    const boardEl = event.container.element.nativeElement;
    const rect = boardEl.getBoundingClientRect();
    const col = Math.max(0, Math.min(9, Math.floor((nativeEvent.clientX - rect.left) / (rect.width / 10))));
    const row = Math.max(0, Math.min(9, Math.floor((nativeEvent.clientY - rect.top) / (rect.height / 10))));
    this.shipDropped.emit({ shipId, row, col });
  }

  getShipStyle(ship: Ship): Record<string, string> {
    if (ship.row === null || ship.col === null) return { display: 'none' };
    const pct = 100 / 10;
    const isH = ship.orientation === 'horizontal';
    return {
      top: `${ship.row * pct}%`,
      left: `${ship.col * pct}%`,
      width: isH ? `${ship.size * pct}%` : `${pct}%`,
      height: isH ? `${pct}%` : `${ship.size * pct}%`,
    };
  }
}
