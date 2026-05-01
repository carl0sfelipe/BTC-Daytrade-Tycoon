'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}

export function ProgressBar({ value, indeterminate, className }: ProgressBarProps) {
  if (indeterminate || value === undefined) {
    return (
      <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
        <div className="h-full w-1/3 animate-[shimmer_1s_infinite] rounded-full bg-primary" />
      </div>
    );
  }
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
