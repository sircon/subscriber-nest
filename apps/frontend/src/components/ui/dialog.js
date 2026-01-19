'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '@/lib/utils';
const Dialog = ({ open, onOpenChange, children }) => {
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", onClick: (e) => {
            if (e.target === e.currentTarget) {
                onOpenChange(false);
            }
        }, children: [_jsx("div", { className: "fixed inset-0 bg-black/50" }), _jsx("div", { className: "relative z-50 w-full max-w-lg mx-4", children: children })] }));
};
const DialogContent = ({ children, className, }) => {
    return (_jsx("div", { className: cn('bg-white rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto', className), children: children }));
};
const DialogHeader = ({ children, className }) => {
    return (_jsx("div", { className: cn('flex flex-col space-y-1.5 mb-4', className), children: children }));
};
const DialogTitle = ({ children, className }) => {
    return (_jsx("h2", { className: cn('text-lg font-semibold leading-none tracking-tight', className), children: children }));
};
const DialogDescription = ({ children, className, }) => {
    return _jsx("p", { className: cn('text-sm text-gray-600', className), children: children });
};
const DialogFooter = ({ children, className }) => {
    return (_jsx("div", { className: cn('flex justify-end gap-2 mt-6', className), children: children }));
};
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, };
