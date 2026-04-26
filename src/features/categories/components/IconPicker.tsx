// src/features/categories/components/IconPicker.tsx
import { CATEGORY_ICONS } from '../icons';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string | null) => void;
  disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled = false }: IconPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {Object.entries(CATEGORY_ICONS).map(([name, Icon]) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            disabled={disabled}
            aria-label={name}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : name)}
            className={cn(
              'flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted',
              selected && 'bg-primary/10 text-primary ring-1 ring-primary',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
