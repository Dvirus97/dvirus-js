import { Directive, effect, ElementRef, inject, input, output } from '@angular/core';

/**
 * Directive that emits an event when a click occurs outside the host element or a group of elements.
 *
 * Usage:
 * ```html
 * <div [clickOutside]="handler"></div>
 * ```
 *
 * - Emits `clickOutside` when a click is detected outside the host and any elements in the `group` input.
 * - Useful for closing popups, dropdowns, or dialogs when clicking outside.
 */
@Directive({
  selector: '[djsClickOutside]',
})
export class ClickOutsideDirective {
  /**
   * Reference to the host element.
   * @internal
   */
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Optional group of elements to consider as 'inside'.
   * If the click is inside any of these, the event will not fire.
   */
  group = input<HTMLElement[]>([]);

  /**
   * Event emitted when a click occurs outside the host and group elements.
   */
  clickOutside = output<MouseEvent>();

  /**
   * Handles document click events and emits if the click is outside.
   * @param event MouseEvent from the document
   */
  private handleClick = (event: MouseEvent) => {
    const allElements = [this.el.nativeElement, ...this.group()];
    const clickedInside = allElements.some((el) => el.contains(event.target as Node));

    if (!clickedInside) {
      this.clickOutside.emit(event);
    }
  };

  /**
   * Sets up the document click listener and cleans up on destroy.
   */
  constructor() {
    effect((cleanFn) => {
      document.addEventListener('click', this.handleClick, true);

      cleanFn(() => {
        document.removeEventListener('click', this.handleClick, true);
      });
    });
  }
}
