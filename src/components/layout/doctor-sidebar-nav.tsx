'use client';

import {
  DOCTOR_NAV_MAIN,
  DOCTOR_NAV_SECONDARY,
  type DoctorNavGroup,
  type DoctorNavItem,
  type DoctorNavLink,
  isPathActive,
  isDoctorNavGroupActive,
  isDoctorNavLinkActive,
} from '@/config/doctor-navigation';
import { getDefaultOpenGroups } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

function isActiveNavChild(
  pathname: string,
  href: string,
  exact: boolean | undefined,
  siblings: { href: string; exact?: boolean }[],
): boolean {
  if (!isPathActive(pathname, href, exact)) return false;
  const matches = siblings.filter((s) => isPathActive(pathname, s.href, s.exact));
  if (matches.length <= 1) return true;
  const best = [...matches].sort((a, b) => b.href.length - a.href.length)[0];
  return best.href === href;
}

interface DoctorSidebarNavProps {
  onNavigate?: () => void;
  className?: string;
}

function NavLinkItem({
  item,
  pathname,
  onNavigate,
}: {
  item: DoctorNavLink;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isDoctorNavLinkActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.title}</span>
    </Link>
  );
}

function NavGroupItem({
  group,
  pathname,
  open,
  onOpenChange,
  onNavigate,
}: {
  group: DoctorNavGroup;
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
}) {
  const groupActive = isDoctorNavGroupActive(pathname, group);
  const Icon = group.icon;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          groupActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pb-1 pl-3 pt-1">
        {group.items.map((child) => {
          const active = isActiveNavChild(pathname, child.href, child.exact, group.items);
          return (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2 rounded-lg py-2 pl-7 pr-3 text-sm transition-colors',
                active
                  ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              {child.title}
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

function NavSection({
  items,
  pathname,
  openGroups,
  setGroupOpen,
  onNavigate,
}: {
  items: DoctorNavItem[];
  pathname: string;
  openGroups: Record<string, boolean>;
  setGroupOpen: (title: string, open: boolean) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item) =>
        item.type === 'link' ? (
          <NavLinkItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ) : (
          <NavGroupItem
            key={item.title}
            group={item}
            pathname={pathname}
            open={openGroups[item.title] ?? false}
            onOpenChange={(open) => setGroupOpen(item.title, open)}
            onNavigate={onNavigate}
          />
        ),
      )}
    </div>
  );
}

export function DoctorSidebarNav({ onNavigate, className }: DoctorSidebarNavProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const defaults = getDefaultOpenGroups(pathname);
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const title of defaults) {
        next[title] = true;
      }
      return next;
    });
  }, [pathname]);

  function setGroupOpen(title: string, open: boolean) {
    setOpenGroups((prev) => ({ ...prev, [title]: open }));
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <nav className="flex flex-col gap-4 p-3">
        <NavSection
          items={DOCTOR_NAV_MAIN}
          pathname={pathname}
          openGroups={openGroups}
          setGroupOpen={setGroupOpen}
          onNavigate={onNavigate}
        />
        <Separator className="bg-sidebar-border" />
        <NavSection
          items={DOCTOR_NAV_SECONDARY}
          pathname={pathname}
          openGroups={openGroups}
          setGroupOpen={setGroupOpen}
          onNavigate={onNavigate}
        />
      </nav>
    </ScrollArea>
  );
}
