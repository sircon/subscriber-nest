'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
/**
 * ListSelector component for selecting which lists to sync from an ESP connection.
 *
 * Note: Different ESPs use different terminology (lists, segments, publications),
 * but this component displays them as 'lists' for UI consistency.
 */
export function ListSelector({ lists, selectedListIds, onSelectionChange, loading = false, error = null, className, }) {
    const allSelected = lists.length > 0 && selectedListIds.length === lists.length;
    const handleToggle = (listId) => {
        if (selectedListIds.includes(listId)) {
            onSelectionChange(selectedListIds.filter((id) => id !== listId));
        }
        else {
            onSelectionChange([...selectedListIds, listId]);
        }
    };
    const handleSelectAll = () => {
        if (allSelected) {
            onSelectionChange([]);
        }
        else {
            onSelectionChange(lists.map((list) => list.id));
        }
    };
    const formatSubscriberCount = (count) => {
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
        return (_jsxs(Card, { className: className, children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Select Lists to Sync" }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-3", children: [1, 2, 3].map((i) => (_jsxs("div", { className: "flex items-center space-x-3 p-3 rounded-md border animate-pulse", children: [_jsx("div", { className: "h-5 w-5 bg-secondary rounded" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "h-4 bg-secondary rounded w-3/4 mb-2" }), _jsx("div", { className: "h-3 bg-secondary rounded w-1/2" })] })] }, i))) }) })] }));
    }
    if (error) {
        return (_jsxs(Card, { className: className, children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Select Lists to Sync" }) }), _jsx(CardContent, { children: _jsx("div", { className: "p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm", children: error }) })] }));
    }
    if (lists.length === 0) {
        return (_jsxs(Card, { className: className, children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Select Lists to Sync" }) }), _jsx(CardContent, { children: _jsx("p", { className: "text-sm text-muted-foreground", children: "No lists available. Please check your ESP connection." }) })] }));
    }
    return (_jsxs(Card, { className: className, children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(CardTitle, { children: "Select Lists to Sync" }), _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: handleSelectAll, disabled: loading, "aria-label": allSelected ? 'Deselect all lists' : 'Select all lists', children: allSelected ? 'Deselect All' : 'Select All' })] }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "space-y-2", children: lists.map((list) => {
                            const isSelected = selectedListIds.includes(list.id);
                            return (_jsxs("label", { className: cn('flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors', 'hover:bg-accent hover:text-accent-foreground', isSelected && 'bg-accent border-primary', !isSelected && 'bg-background'), children: [_jsxs("div", { className: "relative flex items-center justify-center mt-0.5", children: [_jsx("input", { type: "checkbox", checked: isSelected, onChange: () => handleToggle(list.id), className: "sr-only", "aria-label": `Select ${list.name}` }), _jsx("div", { className: cn('h-5 w-5 rounded border-2 flex items-center justify-center transition-colors', isSelected
                                                    ? 'bg-primary border-primary text-primary-foreground'
                                                    : 'border-input bg-background'), "aria-hidden": "true", children: isSelected && (_jsx(Check, { className: "h-3.5 w-3.5 text-primary-foreground" })) })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-medium text-sm", children: list.name }), list.subscriberCount !== undefined &&
                                                list.subscriberCount !== null && (_jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: formatSubscriberCount(list.subscriberCount) })), list.description && (_jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: list.description }))] })] }, list.id));
                        }) }), lists.length > 0 && (_jsxs("div", { className: "mt-4 pt-4 border-t text-sm text-muted-foreground", children: [selectedListIds.length, " of ", lists.length, " list", lists.length !== 1 ? 's' : '', " selected"] }))] })] }));
}
