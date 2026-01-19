'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type List } from '@/lib/api';

export interface ListSelectorProps {
  /**
   * Available lists to display
   */
  lists: List[];
  /**
   * Currently selected list IDs
   */
  selectedListIds: string[];
  /**
   * Callback when selection changes
   */
  onSelectionChange: (selectedIds: string[]) => void;
  /**
   * Whether the component is in a loading state
   */
  loading?: boolean;
  /**
   * Error message to display
   */
  error?: string | null;
  /**
   * Additional className for the container
   */
  className?: string;
}

/**
 * ListSelector component for selecting which lists to sync from an ESP connection.
 *
 * Note: Different ESPs use different terminology (lists, segments, publications),
 * but this component displays them as 'lists' for UI consistency.
 */
export function ListSelector({
  lists,
  selectedListIds,
  onSelectionChange,
  loading = false,
  error = null,
  className,
}: ListSelectorProps) {
  const allSelected =
    lists.length > 0 && selectedListIds.length === lists.length;

  const handleToggle = (listId: string) => {
    if (selectedListIds.includes(listId)) {
      onSelectionChange(selectedListIds.filter((id) => id !== listId));
    } else {
      onSelectionChange([...selectedListIds, listId]);
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(lists.map((list) => list.id));
    }
  };

  const formatSubscriberCount = (count?: number): string => {
    if (count === undefined || count === null) {
      return '';
    }
    if (count >= 1000000) {
      return `(${(count / 1000000).toFixed(1)}M subscribers)`;
    }
    if (count >= 1000) {
      return `(${(count / 1000).toFixed(1)}K subscribers)`;
    }
    return `(${count} ${count === 1 ? 'subscriber' : 'subscribers'})`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Select Lists to Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center space-x-3 p-3 rounded-md border animate-pulse"
              >
                <div className="h-5 w-5 bg-secondary rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-secondary rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Select Lists to Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lists.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Select Lists to Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No lists available. Please check your ESP connection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Select Lists to Sync</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={loading}
            aria-label={allSelected ? 'Deselect all lists' : 'Select all lists'}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {lists.map((list) => {
            const isSelected = selectedListIds.includes(list.id);
            return (
              <label
                key={list.id}
                className={cn(
                  'flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isSelected && 'bg-accent border-primary',
                  !isSelected && 'bg-background'
                )}
              >
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(list.id)}
                    className="sr-only"
                    aria-label={`Select ${list.name}`}
                  />
                  <div
                    className={cn(
                      'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-input bg-background'
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{list.name}</div>
                  {list.subscriberCount !== undefined &&
                    list.subscriberCount !== null && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatSubscriberCount(list.subscriberCount)}
                      </div>
                    )}
                  {list.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {list.description}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
        {lists.length > 0 && (
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            {selectedListIds.length} of {lists.length} list
            {lists.length !== 1 ? 's' : ''} selected
          </div>
        )}
      </CardContent>
    </Card>
  );
}
