import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Pricing', href: '#pricing' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-neutral-950/80 backdrop-blur-xl border-b border-white/10 shadow-xs'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <button
              onClick={() => {
                navigate("/");

                setTimeout(() => {
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }, 50);
              }}
              className="flex items-center gap-2.5 group"
            >
            <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <span className="text-white dark:text-black text-xs font-bold tracking-tight">C</span>
            </div>
            <span className="text-base font-semibold tracking-tight text-black dark:text-white">
              Cortex
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors duration-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                onClick={() => navigate('/auth')}
              >
                Log in
              </Button>
              <Button
                size="sm"
                className="bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl text-sm px-5 shadow-xs"
                onClick={() => navigate('/auth')}
              >
                Get Started
              </Button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden border-t border-black/5 dark:border-white/10 bg-white dark:bg-neutral-950"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-black/5 dark:border-white/10 my-2" />
              <button
                onClick={() => { setMobileOpen(false); navigate('/auth'); }}
                className="w-full px-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left transition-all"
              >
                Log in
              </button>
              <Button
                className="w-full bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl text-sm"
                onClick={() => { setMobileOpen(false); navigate('/auth'); }}
              >
                Get Started
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
