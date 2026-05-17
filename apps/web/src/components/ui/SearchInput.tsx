import {
  forwardRef,
  useRef,
  useCallback,
  type InputHTMLAttributes,
  type MouseEvent,
  type Ref,
} from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';

function assignRef<T>(r: Ref<T> | undefined, value: T | null) {
  if (r == null) return;
  if (typeof r === 'function') r(value);
  else r.current = value;
}

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  /** Кнопка сброса при непустом значении */
  clearable?: boolean;
  /** Если задано, вызывается вместо синтетического onChange('') */
  onClear?: () => void;
  /** Классы обёртки (иконка + поле + clear) */
  className?: string;
  /** Классы самого input */
  inputClassName?: string;
  /** Компактная высота (панели инструментов, пикеры) */
  dense?: boolean;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    className = '',
    inputClassName = '',
    dense = false,
    type = 'text',
    clearable = true,
    value,
    onChange,
    onClear,
    disabled,
    readOnly,
    ...props
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setInputRef = useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      assignRef(ref, el);
    },
    [ref],
  );

  const strValue = value === undefined || value === null ? '' : String(value);
  const showClear = Boolean(clearable && strValue.length > 0 && !disabled && !readOnly);

  const handleClear = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange && inputRef.current) {
      const input = inputRef.current;
      const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      desc?.set?.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const pad = dense ? 'px-2 py-1 gap-1.5 rounded-lg' : 'px-3 py-1.5 gap-2 rounded-xl';
  const iconSz = dense ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const text = dense ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`flex items-center min-w-0 w-full border border-(--color_border) bg-(--color_bg_input) focus-within:border-(--color_primary_light)/60 transition-colors ${pad} ${className}`}
    >
      <MagnifyingGlassIcon
        className={`${iconSz} text-(--color_text_muted) shrink-0 pointer-events-none`}
      />
      <input
        ref={setInputRef}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        className={`flex-1 min-w-0 min-h-0 py-0 leading-5 bg-transparent text-white placeholder:text-(--color_text_muted) border-none focus:outline-none ${text} ${inputClassName}`}
        style={{ outline: 'none' }}
        {...props}
      />
      {showClear && (
        <Button
          type="button"
          variant="unstyled"
          className={`shrink-0 rounded-md text-(--color_text_muted) hover:text-(--color_text_secondary) hover:bg-(--color_bg_card_hover) transition-colors ${dense ? 'p-0.5' : 'p-1 rounded-lg'}`}
          aria-label="Очистить"
          onClick={handleClear}
        >
          <XMarkIcon className={iconSz} />
        </Button>
      )}
    </div>
  );
});

export default SearchInput;
