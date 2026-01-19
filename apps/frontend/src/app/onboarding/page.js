'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi } from '@/lib/api';
import { espConfigs } from '@/lib/esp-config';
export default function OnboardingPage() {
    const router = useRouter();
    const { token } = useAuth();
    const [checkingConnections, setCheckingConnections] = useState(true);
    useEffect(() => {
        const checkExistingConnections = async () => {
            if (!token) {
                setCheckingConnections(false);
                return;
            }
            try {
                const connections = await espConnectionApi.getUserConnections(token, () => {
                    // Handle 401: redirect to login
                    router.push('/login');
                });
                // If user already has connections, skip to Stripe step
                if (connections.length > 0) {
                    router.push('/onboarding/stripe');
                    return;
                }
            }
            catch (err) {
                // If there's an error, just show the provider selection
                console.error('Failed to check existing connections:', err);
            }
            setCheckingConnections(false);
        };
        checkExistingConnections();
    }, [token, router]);
    const handleProviderSelect = (provider) => {
        router.push(`/onboarding/api-key?provider=${provider}`);
    };
    // Show loading state while checking for existing connections
    if (checkingConnections) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-6 py-12", children: _jsxs("div", { className: "w-full max-w-4xl", children: [_jsx("div", { className: "text-center mb-8", children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-8 bg-secondary rounded w-2/3 mx-auto mb-4" }), _jsx("div", { className: "h-4 bg-secondary rounded w-1/2 mx-auto" })] }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [1, 2, 3].map((i) => (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-6 bg-secondary rounded w-1/2 mb-2" }), _jsx("div", { className: "h-4 bg-secondary rounded w-3/4" })] }) }), _jsx(CardContent, { children: _jsx("div", { className: "animate-pulse", children: _jsx("div", { className: "h-10 bg-secondary rounded" }) }) })] }, i))) })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-6 py-12", children: _jsxs("div", { className: "w-full max-w-4xl", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-3xl font-semibold mb-2", children: "Select your email service provider" }), _jsx("p", { className: "text-muted-foreground", children: "Choose the provider you use to manage your email subscribers" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: espConfigs.map((provider) => {
                        return (_jsxs(Card, { className: "cursor-pointer hover:border-primary transition-colors group", onClick: () => handleProviderSelect(provider.id), children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-xl", children: provider.name }), _jsx(CardDescription, { children: provider.description })] }), _jsx(CardContent, { className: "space-y-2", children: _jsxs(Button, { variant: "outline", className: "w-full", onClick: (e) => {
                                            e.stopPropagation();
                                            handleProviderSelect(provider.id);
                                        }, children: ["Select ", provider.name] }) })] }, provider.id));
                    }) })] }) }));
}
