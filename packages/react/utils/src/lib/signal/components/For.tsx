import { useComputed, useReadSignal } from '../hooks';
import React from 'react';

interface ForProps<Item, As extends keyof React.JSX.IntrinsicElements> {
  each: () => Item[];
  track?: (item: Item, index: number) => string | number;
  as?: As;
}

type ForComponentProps<
  Item,
  As extends keyof React.JSX.IntrinsicElements,
> = ForProps<Item, As> &
  Omit<React.ComponentPropsWithRef<As>, keyof ForProps<Item, As>>;

/**
 * Render a list of items reactively. The `each` prop is a function returning
 * an array (usually a signal or computed). The component tracks the list and
 * renders children for each item. Optionally `track` can be provided to
 * generate stable keys.
 *
 * @template Item - item type
 * @template As - element type to render as (defaults to 'div')
 * @param {ForComponentProps<Item, As> & { children?: (item: Item, index: number) => React.ReactNode }} props - For props
 * @returns {JSX.Element} the rendered list
 */
export function For<
  Item,
  As extends keyof React.JSX.IntrinsicElements = 'div',
>({
  each,
  track,
  as,
  children,
  ...rest
}: ForComponentProps<Item, As> & {
  children?: (item: Item, index: number) => React.ReactNode;
}) {
  const ElementType = (as ||
    React.Fragment) as keyof React.JSX.IntrinsicElements;

  const _each = useComputed(each);
  const list = useReadSignal(_each);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <ElementType {...(rest as any)}>
      {(list ?? []).map((item: Item, index: number) => {
        const itemKey = track?.(item, index) ?? index;
        const childElement =
          typeof children == 'function' ? children?.(item, index) : children;

        if (childElement === undefined) {
          return null;
        }

        if (React.isValidElement(childElement)) {
          return React.cloneElement(childElement, { key: itemKey });
        }

        return <React.Fragment key={itemKey}>{childElement}</React.Fragment>;
      })}
    </ElementType>
  );
}
