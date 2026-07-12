import React from 'react';
import { useComputed, useSignalValue } from '../../lib/signals/hooks';

// 🌟 Named structural selector directives
/**
 * Simple wrapper used to mark the `then` branch inside <S> or <ConditionalRender>.
 * It merely forwards its children.
 *
 * @param {{children: React.ReactNode}} props - slot children
 */
export function ThenSlot({ children }: { children: React.ReactNode }) {
  return <React.Fragment>{children}</React.Fragment>;
}

/**
 * Simple wrapper used to mark the `else` branch inside <S> or <ConditionalRender>.
 * It merely forwards its children.
 *
 * @param {{children: React.ReactNode}} props - slot children
 */
export function ElseSlot({ children }: { children: React.ReactNode }) {
  return <React.Fragment>{children}</React.Fragment>;
}

// Assign them as static properties onto S so users can type <S.Then> and <S.Else>

/**
 * Render children conditionally based on a reactive condition function.
 * Accepts <ThenSlot> and <ElseSlot> children to declaratively specify branches.
 *
 * @param {{condition: () => boolean, children: React.ReactNode}} props - conditional render props
 * @returns {JSX.Element|null} chosen branch to render
 */
export function ConditionalRender({
  condition,
  children,
}: {
  condition: () => boolean;
  children: React.ReactNode;
}) {
  const _condition = useComputed(condition);
  const shouldRender = useSignalValue(_condition);

  let thenBranch: React.ReactNode = null;
  let elseBranch: React.ReactNode = null;

  React.Children.forEach(children, (child) => {
    if (React.isValidElement<{ children: React.ReactNode }>(child)) {
      if (child.type === ThenSlot) {
        thenBranch = child.props.children;
      } else if (child.type === ElseSlot) {
        elseBranch = child.props.children;
      }
    }
  });

  if (!thenBranch && !elseBranch) {
    thenBranch = children;
  }

  return shouldRender ? <>{thenBranch}</> : <>{elseBranch}</>;
}
