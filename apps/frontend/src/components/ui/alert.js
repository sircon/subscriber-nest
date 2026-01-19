import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const alertVariants = cva('relative w-full rounded-lg border p-4', {
    variants: {
        variant: {
            default: 'bg-background text-foreground',
            destructive: 'bg-destructive/10 border-destructive/20 text-destructive',
            warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});
const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (_jsx("div", { ref: ref, role: "alert", className: cn(alertVariants({ variant }), className), ...props })));
Alert.displayName = 'Alert';
const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (_jsx("h5", { ref: ref, className: cn('mb-1 font-medium leading-none tracking-tight', className), ...props })));
AlertTitle.displayName = 'AlertTitle';
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('text-sm [&_p]:leading-relaxed', className), ...props })));
AlertDescription.displayName = 'AlertDescription';
export { Alert, AlertTitle, AlertDescription };
