import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  large?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function SearchBar({
  className,
  placeholder = 'Search anything...',
  disabled = false,
  large = false,
  value,
  onChange,
  onSubmit,
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value && onSubmit) onSubmit(value);
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative group w-full',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex items-center w-full',
          'rounded-2xl border border-black/10 dark:border-white/10',
          'bg-white dark:bg-neutral-900',
          'shadow-sm hover:shadow-md',
          'transition-all duration-300',
          large ? 'h-14 sm:h-16' : 'h-12',
          'focus-within:border-black/30 dark:focus-within:border-white/30',
          'focus-within:shadow-lg',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Search
          className={cn(
            'text-neutral-400 shrink-0',
            large ? 'ml-5 w-5 h-5' : 'ml-4 w-4 h-4',
          )}
          strokeWidth={1.5}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex-1 bg-transparent border-none outline-none',
            'text-black dark:text-white',
            'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
            large ? 'px-4 text-base sm:text-lg' : 'px-3 text-sm',
            'font-[350] tracking-tight',
          )}
        />
      </div>
    </motion.form>
  );
}
