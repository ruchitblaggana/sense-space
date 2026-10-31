// SenseSpace — App shell (header navigation + view router + toasts)

import { useEffect } from 'react';
import { useStore, type ViewKey } from './store';
import { ToastHost } from './components/ui';
import { Home, Wrench, Radar, NotebookPen, Compass, GitCompareArrows, GalleryVerticalEnd, GraduationCap, User } from 'lucide-react';
import { Home as HomeView } from './views/Home';
import { DesignBench } from './views/DesignBench';
import { LiveSimulation } from './views/LiveSimulation';
import { ExperimentJournal } from './views/ExperimentJournal';
import { Playground } from './views/Playground';
import { ComparisonLab } from './views/ComparisonLab';
import { DesignGallery } from './views/DesignGallery';
import { Learn } from './views/Learn';
import { About } from './views/About';

const NAV: { key: ViewKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'bench', label: 'Design Bench', icon: Wrench },
  { key: 'simulation', label: 'Live Simulation', icon: Radar },
  { key: 'playground', label: 'Playground', icon: Compass },
  { key: 'comparison', label: 'Comparison', icon: GitCompareArrows },
  { key: 'journal', label: 'Journal', icon: NotebookPen },
  { key: 'gallery', label: 'Gallery', icon: GalleryVerticalEnd },
  { key: 'learn', label: 'Learn', icon: GraduationCap },
  { key: 'about', label: 'About', icon: User },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <rect width="32" height="32" rx="7" fill="#252D32" />
        <circle cx="16" cy="16" r="9" fill="none" stroke="#75A99C" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="16" cy="16" r="2.5" fill="#D98968" />
        <path d="M16 4 L16 7 M28 16 L25 16 M16 28 L16 25 M4 16 L7 16" stroke="#567A92" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div className="leading-none">
        <div className="font-display text-lg text-ink tracking-tight">SenseSpace</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted mt-0.5">Build around senses</div>
      </div>
    </div>
  );
}

function AppShell() {
  const { view, setView, toasts, dismissToast, settings, storageOk } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-view', view);
  }, [view]);

  return (
    <div className="min-h-screen bg-paper-texture flex flex-col">
      <a href="#main" className="sr-only-focusable bg-ink text-paper px-4 py-2 text-sm rounded">Skip to content</a>
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur border-b border-line">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => setView('home')} aria-label="SenseSpace home">
              <Logo />
            </button>
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Primary">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = view === n.key;
                return (
                  <button
                    key={n.key}
                    onClick={() => setView(n.key)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active ? 'bg-ink text-paper' : 'text-muted hover:text-ink hover:bg-sand/60'
                    }`}
                  >
                    <Icon size={15} />
                    {n.label}
                  </button>
                );
              })}
            </nav>
          </div>
          {/* Mobile nav */}
          <nav className="lg:hidden flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1" aria-label="Primary mobile">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = view === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setView(n.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    active ? 'bg-ink text-paper' : 'text-muted hover:bg-sand/60'
                  }`}
                >
                  <Icon size={14} />
                  {n.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {!storageOk && (
        <div className="bg-clay/10 border-b border-clay/20 px-4 py-2 text-center text-sm text-clay-deep">
          Browser storage is unavailable. Your designs and experiments will not be saved after reload.
        </div>
      )}
      {settings.reducedMotion && (
        <div className="bg-blue/10 border-b border-blue/20 px-4 py-1.5 text-center text-xs text-blue-deep font-mono">
          Reduced motion enabled
        </div>
      )}

      <main id="main" className="flex-1 view-enter" key={view}>
        {view === 'home' && <HomeView />}
        {view === 'bench' && <DesignBench />}
        {view === 'simulation' && <LiveSimulation />}
        {view === 'playground' && <Playground />}
        {view === 'comparison' && <ComparisonLab />}
        {view === 'journal' && <ExperimentJournal />}
        {view === 'gallery' && <DesignGallery />}
        {view === 'learn' && <Learn />}
        {view === 'about' && <About />}
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <LogoSmall />
            <span className="font-mono">SenseSpace — a virtual assistive-technology laboratory</span>
          </div>
          <div className="text-xs text-muted font-mono">
            By Ruchit Blaggana · Delhi Public School, Vasant Kunj
          </div>
        </div>
      </footer>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function LogoSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#252D32" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#75A99C" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="16" cy="16" r="2.5" fill="#D98968" />
    </svg>
  );
}

export function App() {
  return <AppShell />;
}
