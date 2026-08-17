import { Github, Linkedin, Mail } from 'lucide-react';

const footerLinks = [
  { label: 'GitHub', href: '#', icon: Github },
  { label: 'LinkedIn', href: '#', icon: Linkedin },
  { label: 'Contact', href: '#', icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t border-black/5 dark:border-white/10 bg-neutral-50/50 dark:bg-neutral-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo and tagline */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center">
              <span className="text-xs font-bold tracking-tight text-black/60 dark:text-white/60">C</span>
            </div>
            <span className="text-sm text-neutral-500 dark:text-neutral-500">
              &copy; 2026 Cortex. All rights reserved.
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-1">
            {footerLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-neutral-500 hover:text-black dark:hover:text-white transition-colors duration-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
