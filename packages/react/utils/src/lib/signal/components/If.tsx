import React from 'react';
import { useComputed, useSignal } from '../hooks';

// 🌟 Named structural selector directives
export function ThenSlot({ children }: { children: React.ReactNode }) {
  return <React.Fragment>{children}</React.Fragment>;
}

export function ElseSlot({ children }: { children: React.ReactNode }) {
  return <React.Fragment>{children}</React.Fragment>;
}

// Assign them as static properties onto S so users can type <S.Then> and <S.Else>

export function ConditionalRender({
  condition,
  children,
}: {
  condition: () => boolean;
  children: React.ReactNode;
}) {
  const _condition = useComputed(condition);
  const shouldRender = useSignal(_condition);

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
