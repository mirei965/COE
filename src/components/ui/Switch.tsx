import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, ...props }, ref) => {
    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {label && (
            <label
              htmlFor={props.id}
              className="text-sm font-medium text-slate-900 dark:text-slate-50"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            ref={ref}
            {...props}
          />
          <div
            className={cn(
              "w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-400 rounded-full peer",
              "dark:bg-slate-700",
              "peer-checked:after:translate-x-full peer-checked:after:border-white",
              "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
              "peer-checked:bg-brand-400",
              className
            )}
          />
        </label>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };


