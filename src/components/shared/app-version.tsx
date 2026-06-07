import { APP_NAME, APP_VERSION } from '@/lib/version';
import { cn } from '@/lib/utils';

interface AppVersionProps {
  className?: string;
  showName?: boolean;
}

export function AppVersion({ className, showName = false }: AppVersionProps) {
  return (
    <p className={cn('text-[11px] text-muted-foreground', className)}>
      {showName ? `${APP_NAME} · ` : ''}v{APP_VERSION}
    </p>
  );
}
