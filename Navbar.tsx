import type { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  viewMode: 'landing' | 'app';
  onNavigateView: (mode: 'landing' | 'app') => void;
  onSignIn: () => void;
  isSigningIn: boolean;
}

export function Navbar({
  user,
  viewMode,
  onNavigateView,
  onSignIn,
  isSigningIn,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#135D3B]/10 dark:border-white/10 bg-[#FAF4EA]/95 dark:bg-[#0B110E]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 h-16">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-2xl font-black uppercase tracking-tight text-[#135D3B] dark:text-[#E5B84B] whitespace-nowrap shrink-0"
        >
          NutriZim
        </a>

        {/* Zone 2: 5 concise single-line text nav links matching reference */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-[#2F473A] dark:text-slate-300">
          {[
            { href: '#scanner-engine', id: 'scanner-engine', label: '3D Plate' },
            { href: '#selected-features', id: 'selected-features', label: 'Features' },
            { href: '#food-database', id: 'food-database', label: 'Database' },
            { href: '#founders', id: 'founders', label: 'Founders' },
            { href: '#contact-footer', id: 'contact-footer', label: 'Contact' },
          ].map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => {
                if (viewMode === 'app') {
                  e.preventDefault();
                  onNavigateView('landing');
                  setTimeout(() => {
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  }, 80);
                }
              }}
              className="hover:text-[#135D3B] dark:hover:text-[#E5B84B] transition-colors whitespace-nowrap shrink-0"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => onNavigateView(viewMode === 'landing' ? 'app' : 'landing')}
              className="min-h-[40px] rounded-full bg-[#135D3B] px-5 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#0F4B2F] transition-colors whitespace-nowrap shrink-0"
            >
              {viewMode === 'landing' ? 'Open Tracker' : 'Back to Home'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="min-h-[40px] rounded-full bg-[#135D3B] px-5 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#0F4B2F] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              {isSigningIn ? 'Connecting...' : 'Start Tracking'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
