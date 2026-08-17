import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className={cn('w-9 h-9', className)} />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative flex items-center justify-center w-9 h-9 rounded-xl',
        'hover:bg-black/5 dark:hover:bg-white/10',
        'transition-all duration-300',
        'group',
        className,
      )}
      aria-label="Toggle dark mode"
    >
      <Sun
        className={cn(
          'absolute w-4 h-4 transition-all duration-500',
          isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100',
        )}
        strokeWidth={1.5}
      />
      <Moon
        className={cn(
          'absolute w-4 h-4 transition-all duration-500',
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0',
        )}
        strokeWidth={1.5}
      />
    </button>
  );
}
