import { Component, Input } from '@angular/core';
import type { Orientation, Ship } from '../../models/ship.model';

@Component({
  selector: 'app-ship',
  standalone: true,
  templateUrl: './ship.component.html',
  styleUrl: './ship.component.scss',
})
export class ShipComponent {
  @Input({ required: true }) ship!: Ship;
  @Input() orientation: Orientation = 'horizontal';

  get isHorizontal(): boolean {
    return this.orientation === 'horizontal';
  }

  get cells(): number[] {
    return Array.from({ length: this.ship.size }, (_, i) => i);
  }
}
