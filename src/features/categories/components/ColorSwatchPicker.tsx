// src/features/categories/components/ColorSwatchPicker.tsx
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SWATCHES = [
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Rose',    hex: '#f43f5e' },
  { label: 'Sky',     hex: '#0ea5e9' },
  { label: 'Amber',   hex: '#f59e0b' },
  { label: 'Violet',  hex: '#8b5cf6' },
  { label: 'Orange',  hex: '#f97316' },
  { label: 'Slate',   hex: '#64748b' },
  { label: 'Cyan',    hex: '#06b6d4' },
  { label: 'Pink',    hex: '#ec4899' },
  { label: 'Indigo',  hex: '#6366f1' },
  { label: 'Lime',    hex: '#84cc16' },
  { label: 'Teal',    hex: '#14b8a6' },
];

interface ColorSwatchPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  disabled?: boolean;
}

export function ColorSwatchPicker({ value, onChange, disabled = false }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SWATCHES.map((swatch) => {
        const selected = value === swatch.hex;
        return (
          <button
            key={swatch.hex}
            type="button"
            disabled={disabled}
            aria-label={swatch.label}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : swatch.hex)}
            className={cn(
              'size-7 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected && 'ring-2 ring-ring ring-offset-2',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            style={{ backgroundColor: swatch.hex }}
          >
            {selected && (
              <Check className="mx-auto size-3.5 text-white drop-shadow-sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}
