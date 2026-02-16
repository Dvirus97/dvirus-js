import { Directive, effect, ElementRef, inject, input, output } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
})
export class ClickOutsideDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  group = input<HTMLElement[]>([]);
  clickOutside = output<MouseEvent>();

  private handleClick = (event: MouseEvent) => {
    const allElements = [this.el.nativeElement, ...this.group()];
    const clickedInside = allElements.some((el) => el.contains(event.target as Node));

    if (!clickedInside) {
      this.clickOutside.emit(event);
    }
  };

  constructor() {
    effect((cleanFn) => {
      document.addEventListener('click', this.handleClick, true);

      cleanFn(() => {
        document.removeEventListener('click', this.handleClick, true);
      });
    });
  }
}
