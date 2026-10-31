// SenseSpace — Home / landing

import { ArrowRight, BookOpen, Compass, GitCompareArrows, GraduationCap, NotebookPen, Radar, Wrench } from 'lucide-react';
import { useStore, type ViewKey } from '../store';
import { Button, Card, SectionLabel } from '../components/ui';
import { DevicePreview } from '../components/SimulationArena';
import { createDefaultConfig } from '../defaults';

const FLOW = [
  { icon: Wrench, label: 'Design', desc: 'Assemble sensors, alerts, and a controller.' },
  { icon: Radar, label: 'Test', desc: 'Run the device in an interactive environment.' },
  { icon: Activity, label: 'Observe', desc: 'Inspect readings, events, and detection behavior.' },
  { icon: NotebookPen, label: 'Improve', desc: 'Document experiments and compare designs.' },
];

function Activity({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

const SECTIONS: { key: ViewKey; icon: typeof Wrench; title: string; desc: string }[] = [
  { key: 'bench', icon: Wrench, title: 'Design Bench', desc: 'Assemble a virtual assistive device — sensors, alerts, controller, and battery.' },
  { key: 'simulation', icon: Radar, title: 'Live Simulation', desc: 'Move through environments, add obstacles, and observe real detection behavior.' },
  { key: 'playground', icon: Compass, title: 'Accessibility Playground', desc: 'Six engineering challenges that teach sensor-design principles.' },
  { key: 'comparison', icon: GitCompareArrows, title: 'Comparison Lab', desc: 'Evaluate two configurations under identical conditions.' },
  { key: 'journal', icon: NotebookPen, title: 'Experiment Journal', desc: 'Structured research notes with autosave and linking to prototypes.' },
  { key: 'learn', icon: GraduationCap, title: 'Learning Mode', desc: 'Interactive explanations of the engineering behind the simulation.' },
];

export function Home() {
  const { setView, config } = useStore();
  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-8 mb-12">
        <div className="flex flex-col justify-center">
          <SectionLabel>SenseSpace</SectionLabel>
          <h1 className="font-display text-4xl sm:text-5xl text-ink mt-2 leading-tight">
            Build technology<br />around human senses.
          </h1>
          <p className="text-base text-muted mt-4 max-w-xl leading-relaxed">
            A virtual assistive-technology laboratory. Design sensor-based devices, simulate navigation,
            investigate detection limits, and improve your designs through controlled experiments —
            all in the browser, no hardware required.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button variant="teal" size="lg" onClick={() => setView('bench')}>
              Start designing <ArrowRight size={18} />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setView('playground')}>
              Try a challenge
            </Button>
          </div>
        </div>
        <div className="bg-grid-fine rounded-2xl border border-line p-6 flex items-center justify-center">
          <DevicePreview config={config} size={280} />
        </div>
      </div>

      {/* Workflow */}
      <div className="mb-12">
        <SectionLabel className="mb-3 block">The process</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FLOW.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="relative">
                <Card className="p-4 h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
                    <Icon size={18} className="text-blue" />
                  </div>
                  <h3 className="font-display text-lg text-ink">{f.label}</h3>
                  <p className="text-xs text-muted mt-1">{f.desc}</p>
                </Card>
                {i < FLOW.length - 1 && (
                  <ArrowRight size={16} className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-muted z-10" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sections grid */}
      <div className="mb-12">
        <SectionLabel className="mb-3 block">Explore</SectionLabel>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.key} className="p-5 hover:border-blue/40 transition-colors cursor-pointer" as="button">
                <div onClick={() => setView(s.key)} className="text-left">
                  <div className="w-10 h-10 rounded-lg bg-ink/5 flex items-center justify-center mb-3">
                    <Icon size={20} className="text-blue" />
                  </div>
                  <h3 className="font-display text-lg text-ink mb-1">{s.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Inspiration */}
      <Card className="p-6 bg-grid-fine">
        <SectionLabel className="mb-2 block">The inspiration</SectionLabel>
        <p className="text-base text-ink-soft leading-relaxed max-w-2xl">
          SenseSpace extends a real STEM project by Ruchit Blaggana — a smart hat for people with visual impairments,
          built with an Arduino Uno and ultrasonic sensors during a summer program at IIT Delhi through Rancho Labs.
          This laboratory turns that single project into an interactive space for exploring sensor behavior,
          accessibility, and the iterative process of engineering.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => setView('about')}>
          Read the full story <ArrowRight size={16} />
        </Button>
      </Card>
    </div>
  );
}
