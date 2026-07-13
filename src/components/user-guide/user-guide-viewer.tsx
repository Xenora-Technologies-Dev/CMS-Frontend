'use client';

import type { UserGuideContent } from '@/content/user-guide-content';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { APP_NAME, APP_VERSION } from '@/lib/version';
import { ChevronDown, Lightbulb, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface UserGuideViewerProps {
  guide: UserGuideContent;
  showPrintHint?: boolean;
}

export function UserGuideViewer({ guide, showPrintHint = true }: UserGuideViewerProps) {
  const [query, setQuery] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(guide.sections.map((s) => s.id)),
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guide.sections;
    return guide.sections.filter(
      (section) =>
        section.title.toLowerCase().includes(q) ||
        section.steps.some((step) => step.toLowerCase().includes(q)) ||
        section.tips?.some((tip) => tip.toLowerCase().includes(q)),
    );
  }, [guide.sections, query]);

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="max-w-3xl text-sm text-muted-foreground">{guide.introduction}</p>
            <Badge variant="secondary" className="mt-1">
              {APP_NAME} v{APP_VERSION}
            </Badge>
          </div>
          {showPrintHint && (
            <p className="max-w-xs text-xs text-muted-foreground">
              Tip: Use your browser Print (Ctrl+P) to save this guide as PDF for distribution.
            </p>
          )}
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this guide…"
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        {filteredSections.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No sections match your search</p>
        ) : (
          filteredSections.map((section, index) => {
            const isOpen = openSections.has(section.id);
            return (
              <div key={section.id} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-slate-900">{section.title}</span>
                  </span>
                  <ChevronDown
                    className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-4 border-t px-5 py-4">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
                      {section.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    {section.tips && section.tips.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
                          <Lightbulb className="h-3.5 w-3.5" />
                          Tips
                        </p>
                        <ul className="list-disc space-y-1 pl-4 text-sm text-amber-900">
                          {section.tips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
