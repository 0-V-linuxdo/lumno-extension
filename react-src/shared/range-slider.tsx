import type {
  ComponentPropsWithoutRef,
  ReactNode
} from 'react';

export interface RangeSliderProps
  extends Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type'> {
  children?: ReactNode;
  className?: string;
  inputClass?: string;
}

export function RangeSlider({
  children,
  className,
  inputClass,
  ...inputProps
}: RangeSliderProps) {
  return (
    <div className={className}>
      <input
        {...inputProps}
        className={inputClass}
        type="range"
      />
      {children}
    </div>
  );
}
