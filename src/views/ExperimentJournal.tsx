// SenseSpace — Experiment Journal
// Research-oriented structured notes with autosave, search, and linking to prototypes.

import { useEffect, useMemo, useState } from 'react';
import { Copy, FileText, Plus, Search, Trash2, NotebookPen } from 'lucide-react';
import { useStore } from '../store';
import type { Experiment, ExperimentStatus } from '../types';
import { uid } from '../defaults';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, SectionLabel, Select, useDebounced } from '../components/ui';

export function ExperimentJournal() {
  const { experiments, saveCurrentExperiment, removeExperiment, config, notify } = useStore();
  const [activeId, setActiveId] = useState<string | null>(experiments[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ExperimentStatus | 'all'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const debouncedSearch = useDebounced(search, 200);

  useEffect(() => {
    if (!activeId && experiments.length > 0) setActiveId(experiments[0].id);
  }, [experiments, activeId]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return experiments.filter((e) => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (!q) return true;
      return e.title.toLowerCase().includes(q) || e.researchQuestion.toLowerCase().includes(q) || e.hypothesis.toLowerCase().includes(q);
    });
  }, [experiments, debouncedSearch, filterStatus]);

  const active = experiments.find((e) => e.id === activeId) ?? null;

  function createExperiment() {
    const e: Experiment = {
      id: uid('exp'),
      title: 'New experiment',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      status: 'draft',
      researchQuestion: '',
      hypothesis: '',
      configSnapshot: { ...config },
      configName: config.name,
      testEnvironment: '',
      controlledVariables: '',
      independentVariable: '',
      evaluationMetrics: '',
      expectedResult: '',
      observedResult: '',
      limitations: '',
      conclusion: '',
      nextExperiment: '',
    };
    saveCurrentExperiment(e);
    setActiveId(e.id);
    notify('New experiment created.', 'success');
  }

  function duplicateExperiment(e: Experiment) {
    const copy: Experiment = {
      ...e,
      id: uid('exp'),
      title: `${e.title} (copy)`,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      isExample: false,
    };
    saveCurrentExperiment(copy);
    setActiveId(copy.id);
    notify('Experiment duplicated.', 'success');
  }

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <SectionLabel>Experiment Journal</SectionLabel>
          <h1 className="font-display text-3xl text-ink mt-1">Research notes</h1>
          <p className="text-sm text-muted mt-1">Structured engineering experiments inspired by a physical notebook. Autosaves as you type.</p>
        </div>
        <Button variant="teal" onClick={createExperiment}>
          <Plus size={16} /> New experiment
        </Button>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        {/* List */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search experiments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-softwhite border border-line rounded-lg text-sm"
            />
          </div>
          <Select
            value={filterStatus}
            ariaLabel="Filter by status"
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'in-progress', label: 'In progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'archived', label: 'Archived' },
            ]}
            onChange={(v) => setFilterStatus(v as ExperimentStatus | 'all')}
          />
          <div className="space-y-2">
            {filtered.length === 0 && <p className="text-sm text-muted px-1">No experiments match.</p>}
            {filtered.map((e) => (
              <ExperimentRow
                key={e.id}
                exp={e}
                selected={activeId === e.id}
                onSelect={() => setActiveId(e.id)}
                onDuplicate={() => duplicateExperiment(e)}
                onDelete={() => setConfirmDelete(e.id)}
              />
            ))}
          </div>
        </div>

        {/* Editor */}
        <div>
          {!active && (
            <Card className="p-6">
              <EmptyState title="Select an experiment" icon={<NotebookPen size={32} />}>
                Choose an experiment from the list or create a new one.
              </EmptyState>
            </Card>
          )}
          {active && <ExperimentEditor exp={active} onSave={saveCurrentExperiment} />}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this experiment?"
        message="This will permanently remove the experiment record. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) removeExperiment(confirmDelete);
          if (activeId === confirmDelete) setActiveId(null);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

function ExperimentRow({ exp, selected, onSelect, onDuplicate, onDelete }: { exp: Experiment; selected: boolean; onSelect: () => void; onDuplicate: () => void; onDelete: () => void }) {
  return (
    <div className={`p-3 rounded-lg border transition-colors ${selected ? 'border-blue/40 bg-blue/5' : 'border-line bg-softwhite hover:bg-sand/40'}`}>
      <button onClick={onSelect} className="text-left w-full">
        <div className="flex items-center gap-2 mb-1">
          {exp.isExample && <Badge tone="blue">Example</Badge>}
          <StatusBadge status={exp.status} />
        </div>
        <h3 className="text-sm font-medium text-ink leading-snug">{exp.title}</h3>
        {exp.researchQuestion && <p className="text-xs text-muted mt-1 line-clamp-2">{exp.researchQuestion}</p>}
      </button>
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-lineSoft">
        <button onClick={onDuplicate} aria-label="Duplicate experiment" className="text-muted hover:text-ink p-1"><Copy size={12} /></button>
        <button onClick={onDelete} aria-label="Delete experiment" className="text-muted hover:text-clay-deep p-1"><Trash2 size={12} /></button>
        <span className="text-[10px] font-mono text-muted ml-auto">{new Date(exp.modifiedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ExperimentStatus }) {
  const tones = { draft: 'muted', 'in-progress': 'blue', completed: 'teal', archived: 'clay' } as const;
  return <Badge tone={tones[status]}>{status}</Badge>;
}

function ExperimentEditor({ exp, onSave }: { exp: Experiment; onSave: (e: Experiment) => void }) {
  const [local, setLocal] = useState<Experiment>(exp);

  useEffect(() => {
    setLocal(exp);
  }, [exp.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // autosave (debounced)
  useEffect(() => {
    const h = setTimeout(() => {
      if (local.title !== exp.title || local.hypothesis !== exp.hypothesis) {
        onSave(local);
      } else {
        onSave(local);
      }
    }, 600);
    return () => clearTimeout(h);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof Experiment>(key: K, value: Experiment[K]) {
    setLocal((l) => ({ ...l, [key]: value }));
  }

  return (
    <Card className="p-5">
      {local.isExample && (
        <div className="mb-4">
          <Badge tone="blue">Example experiment</Badge>
          <p className="text-xs text-muted mt-1">This is provided as a reference. Duplicate it to create your own editable copy.</p>
        </div>
      )}
      <div className="space-y-4">
        <Field label="Experiment title">
          <input type="text" value={local.title} onChange={(e) => update('title', e.target.value)} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Status">
            <Select
              value={local.status}
              ariaLabel="Experiment status"
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'in-progress', label: 'In progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'archived', label: 'Archived' },
              ]}
              onChange={(v) => update('status', v as ExperimentStatus)}
            />
          </Field>
          <Field label="Linked prototype">
            <input type="text" value={local.configName ?? ''} readOnly className="w-full bg-sand/40 border border-line rounded-lg px-3 py-2 text-sm font-mono text-muted" />
          </Field>
        </div>
        <Field label="Research question">
          <textarea value={local.researchQuestion} onChange={(e) => update('researchQuestion', e.target.value)} rows={2} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" />
        </Field>
        <Field label="Hypothesis">
          <textarea value={local.hypothesis} onChange={(e) => update('hypothesis', e.target.value)} rows={2} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Test environment"><input type="text" value={local.testEnvironment} onChange={(e) => update('testEnvironment', e.target.value)} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Independent variable"><input type="text" value={local.independentVariable} onChange={(e) => update('independentVariable', e.target.value)} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Controlled variables"><textarea value={local.controlledVariables} onChange={(e) => update('controlledVariables', e.target.value)} rows={2} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Evaluation metrics"><textarea value={local.evaluationMetrics} onChange={(e) => update('evaluationMetrics', e.target.value)} rows={2} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Expected result"><textarea value={local.expectedResult} onChange={(e) => update('expectedResult', e.target.value)} rows={2} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Observed result"><textarea value={local.observedResult} onChange={(e) => update('observedResult', e.target.value)} rows={2} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Limitations"><textarea value={local.limitations} onChange={(e) => update('limitations', e.target.value)} rows={2} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Conclusion"><textarea value={local.conclusion} onChange={(e) => update('conclusion', e.target.value)} rows={2} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" /></Field>
        </div>
        <Field label="Next experiment">
          <textarea value={local.nextExperiment} onChange={(e) => update('nextExperiment', e.target.value)} rows={2} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" />
        </Field>
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <span className="text-xs font-mono text-muted">
            Created {new Date(local.createdAt).toLocaleDateString()} · Modified {new Date(local.modifiedAt).toLocaleDateString()}
          </span>
          <span className="text-xs text-teal-deep flex items-center gap-1"><FileText size={12} /> Autosaved</span>
        </div>
      </div>
    </Card>
  );
}
