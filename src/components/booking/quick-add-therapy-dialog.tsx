'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createTherapy } from '@/lib/therapy-api';
import type { Therapy } from '@/lib/types';
import { getErrorMessage } from '@/lib/validation-errors';
import { useState } from 'react';

const DEFAULT_PACKAGE_VALIDITY_DAYS = '365';

interface QuickAddTherapyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (therapy: Therapy) => void;
}

export function QuickAddTherapyDialog({
  open,
  onOpenChange,
  onCreated,
}: QuickAddTherapyDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [isPackageBased, setIsPackageBased] = useState(false);
  const [packageSessions, setPackageSessions] = useState('');
  const [packageValidityDays, setPackageValidityDays] = useState(DEFAULT_PACKAGE_VALIDITY_DAYS);
  const [packageDescription, setPackageDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setName('');
    setCode('');
    setDescription('');
    setDurationMinutes('60');
    setPrice('');
    setCurrency('AED');
    setIsPackageBased(false);
    setPackageSessions('');
    setPackageValidityDays(DEFAULT_PACKAGE_VALIDITY_DAYS);
    setPackageDescription('');
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Therapy name is required');
      return;
    }

    const duration = Number.parseInt(durationMinutes, 10);
    if (Number.isNaN(duration) || duration < 5) {
      setError('Duration must be at least 5 minutes');
      return;
    }

    let parsedPrice: number | undefined;
    if (price.trim()) {
      parsedPrice = Number.parseFloat(price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        setError('Cost must be a valid positive number');
        return;
      }
    }

    let sessions: number | undefined;
    let validityDays: number | undefined;
    if (isPackageBased) {
      sessions = Number.parseInt(packageSessions, 10);
      validityDays = Number.parseInt(packageValidityDays, 10);
      if (Number.isNaN(sessions) || sessions < 1) {
        setError('Number of sessions is required for package-based therapies');
        return;
      }
      if (Number.isNaN(validityDays) || validityDays < 1) {
        setError('Package validity (days) is required for package-based therapies');
        return;
      }
    }

    setLoading(true);
    try {
      const { therapy } = await createTherapy({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        durationMinutes: duration,
        price: parsedPrice,
        currency,
        isPackageBased,
        ...(isPackageBased && {
          packageSessions: sessions,
          packageValidityDays: validityDays,
          packageDescription: packageDescription.trim() || undefined,
        }),
      });

      onCreated({
        id: therapy.id,
        name: therapy.name,
        code: therapy.code,
        durationMinutes: therapy.durationMinutes,
        isPackageBased: therapy.isPackageBased,
        packageSessions: therapy.packageSessions,
        packageValidityDays: therapy.packageValidityDays,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create therapy'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick Add Therapy</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-therapy-name">Therapy name *</Label>
            <Input
              id="quick-therapy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-therapy-code">Code</Label>
            <Input
              id="quick-therapy-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-therapy-description">Description</Label>
            <Textarea
              id="quick-therapy-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-therapy-duration">Duration (minutes) *</Label>
            <Input
              id="quick-therapy-duration"
              type="number"
              min={5}
              max={480}
              step={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-therapy-price">Cost</Label>
              <Input
                id="quick-therapy-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Is Package Based?</Label>
            <Select
              value={isPackageBased ? 'yes' : 'no'}
              onValueChange={(v) => {
                const next = v === 'yes';
                setIsPackageBased(next);
                if (!next) {
                  setPackageSessions('');
                  setPackageValidityDays(DEFAULT_PACKAGE_VALIDITY_DAYS);
                  setPackageDescription('');
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isPackageBased && (
            <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium">Package configuration</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quick-package-sessions">Number of sessions *</Label>
                  <Input
                    id="quick-package-sessions"
                    type="number"
                    min={1}
                    max={100}
                    value={packageSessions}
                    onChange={(e) => setPackageSessions(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-package-validity">Package validity (days) *</Label>
                  <Input
                    id="quick-package-validity"
                    type="number"
                    min={1}
                    max={3650}
                    value={packageValidityDays}
                    onChange={(e) => setPackageValidityDays(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Default: {DEFAULT_PACKAGE_VALIDITY_DAYS} days
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-package-description">Package description</Label>
                <Textarea
                  id="quick-package-description"
                  rows={2}
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder="e.g. 10 sessions over 60 days"
                />
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save Therapy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
