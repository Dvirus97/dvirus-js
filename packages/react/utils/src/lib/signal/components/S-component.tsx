import React, { ReactNode } from 'react';
import { useComputed, useSignal } from '../hooks';
import { For } from './For';
import { ConditionalRender, ElseSlot, ThenSlot } from './If';
import { effect } from '@dvirus-js/utils/signals';

type ReactiveProps<Props> = {
  [K in keyof Props as K extends `on${string}`
    ? K
    : `$${K & string}`]?: K extends `on${string}` ? Props[K] : () => Props[K];
};

type SmartProps<
  T = unknown,
  As extends keyof React.JSX.IntrinsicElements = 'div',
> = { value?: () => T; as?: As } & (
  | {
      $if?: () => boolean;
      $for?: never;
      children?: React.ReactNode;
    }
  | {
      $for: {
        each: () => T[];
        track?: (item: T, index: number) => string | number;
      };
      $if?: never;
      children: React.ReactNode | ((item: T, index: number) => React.ReactNode);
    }
);

export type SComponentProps<
  T,
  As extends keyof React.JSX.IntrinsicElements,
> = SmartProps<T, As> &
  Omit<React.ComponentPropsWithRef<As>, keyof SmartProps<T, As>> &
  ReactiveProps<Omit<React.ComponentPropsWithRef<As>, `on${string}`>>;

export function S<
  T = unknown,
  As extends keyof React.JSX.IntrinsicElements = 'div',
>(props: SComponentProps<T, As>) {
  const elementRef = React.useRef<HTMLElement>(null);

  if (props.$if !== undefined) {
    return (
      <ConditionalRender condition={props.$if}>
        {props.children as ReactNode}
      </ConditionalRender>
    );
  }

  if (props.$for !== undefined) {
    const { $for, ..._rest } = props;
    return (
      <For
        each={$for.each}
        children={props.children}
        track={$for.track}
        as={props.as}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(_rest as any)}
      />
    );
  }

  const { value, as, children, ...rest } = props;

  // a) If it's simple text or a number that needs to be rendered with peak performance
  if (value && !as) {
    const val = useComputed(value);
    const currentVal = useSignal(val);
    return <>{currentVal}</>;
  }

  React.useEffect(() => {
    const cleanups: (() => void)[] = [];
    const el = elementRef.current;
    if (!el) return;

    // Iterate over the rest of the props to find dynamic ones (starting with $)
    Object.keys(rest).forEach((key) => {
      // If the key starts with $, we treat it as a dynamic property
      if (!key.startsWith('$')) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = rest[key as keyof typeof rest] as () => any; // The function that returns the dynamic value
      const domAttributeName = key.slice(1); // Remove the $ to get the actual DOM attribute name

      if (['for', 'if'].includes(domAttributeName)) return; // Skip special cases

      const destroy = effect(() => {
        const rawValue = fn(); // Run the signal/function

        // Special handling for style
        if (domAttributeName === 'style') {
          Object.assign(el.style, rawValue);
        }
        // Special handling for className
        else if (domAttributeName === 'className') {
          el.className = rawValue;
        }
        // Special handling for all other regular attributes (src, disabled, href, placeholder...)
        else {
          if (
            rawValue === false ||
            rawValue === null ||
            rawValue === undefined
          ) {
            el.removeAttribute(domAttributeName);
          } else {
            el.setAttribute(domAttributeName, String(rawValue));
          }
        }
      });

      cleanups.push(destroy.destroy);
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const staticProps: Record<string, unknown> = {};
  Object.keys(rest).forEach((key) => {
    if (!key.startsWith('$')) {
      staticProps[key] = rest[key as keyof typeof rest];
    }
  });

  return React.createElement(
    as || 'div',
    { ref: elementRef, ...staticProps },
    children as ReactNode,
  );
}

S.Then = ThenSlot;
S.Else = ElseSlot;
