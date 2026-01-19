'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronDown, Database, Download, RefreshCw, Shield, Zap, CheckCircle2, } from 'lucide-react';
import Link from 'next/link';
import { getFormattedEspList } from '@/lib/esp-config';
export default function Home() {
    return (_jsxs("div", { className: "min-h-screen nest-pattern grain-overlay", children: [_jsx(Navigation, {}), _jsx(HeroSection, {}), _jsx(PricingSection, {}), _jsx(FAQSection, {}), _jsx(Footer, {})] }));
}
function Navigation() {
    return (_jsx("nav", { className: "fixed top-0 left-0 right-0 z-50 px-6 py-4 animate-fade-in", children: _jsxs("div", { className: "max-w-6xl mx-auto flex items-center justify-between", children: [_jsxs("a", { href: "#", className: "flex items-center gap-2 group", children: [_jsx("div", { className: "w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors", children: _jsx(Database, { className: "w-4 h-4 text-primary" }) }), _jsx("span", { className: "font-semibold text-lg tracking-tight", children: "SubscriberNest" })] }), _jsxs("div", { className: "hidden md:flex items-center gap-8", children: [_jsx("a", { href: "#pricing", className: "text-sm text-muted-foreground hover:text-foreground transition-colors", children: "Pricing" }), _jsx("a", { href: "#faq", className: "text-sm text-muted-foreground hover:text-foreground transition-colors", children: "FAQ" }), _jsx(Button, { size: "sm", className: "gap-2", asChild: true, children: _jsxs(Link, { href: "/login", children: ["Get Started ", _jsx(ArrowRight, { className: "w-3 h-3" })] }) })] })] }) }));
}
function HeroSection() {
    return (_jsxs("section", { className: "relative pt-32 pb-24 px-6 overflow-hidden", children: [_jsx("div", { className: "absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" }), _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsxs("div", { className: "max-w-3xl mx-auto text-center mb-16", children: [_jsxs("div", { className: "animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8", children: [_jsx(Shield, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Protect your most valuable asset" })] }), _jsxs("h1", { className: "animate-fade-up delay-100 text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.1] mb-6", children: ["Keep your audience", ' ', _jsx("span", { className: "text-gradient italic", children: "safe" }), " and backed up"] }), _jsx("p", { className: "animate-fade-up delay-200 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed", children: "Your subscribers are priceless. We sync daily to keep them backed up. Download or switch ESPs anytime, worry-free." }), _jsx("div", { className: "animate-fade-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4", children: _jsx(Button, { size: "lg", className: "gap-2 text-base px-8 h-14 animate-pulse-glow", asChild: true, children: _jsxs(Link, { href: "/login", children: ["Get Started ", _jsx(ArrowRight, { className: "w-4 h-4" })] }) }) })] }), _jsx("div", { className: "animate-fade-up delay-500 relative max-w-4xl mx-auto", children: _jsxs("div", { className: "relative animate-float", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent rounded-2xl blur-2xl -z-10 scale-95" }), _jsx("div", { className: "border-gradient hover-lift", children: _jsxs("div", { className: "bg-card rounded-xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-2 px-4 py-3 border-b border-border/50", children: [_jsxs("div", { className: "flex gap-1.5", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-red-500/60" }), _jsx("div", { className: "w-3 h-3 rounded-full bg-yellow-500/60" }), _jsx("div", { className: "w-3 h-3 rounded-full bg-green-500/60" })] }), _jsx("div", { className: "flex-1 flex justify-center", children: _jsx("div", { className: "px-4 py-1 bg-secondary/50 rounded-md text-xs text-muted-foreground", children: "subscribernest.com" }) }), _jsx("div", { className: "w-[52px]" })] }), _jsxs("div", { className: "aspect-[16/9] bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 opacity-30", children: _jsxs("div", { className: "grid grid-cols-12 gap-4 p-8 h-full", children: [_jsxs("div", { className: "col-span-2 space-y-3", children: [_jsx("div", { className: "h-8 bg-primary/10 rounded-md animate-shimmer" }), _jsx("div", { className: "h-6 bg-muted/30 rounded-md w-4/5" }), _jsx("div", { className: "h-6 bg-muted/30 rounded-md w-3/5" }), _jsx("div", { className: "h-6 bg-muted/30 rounded-md w-4/5" }), _jsx("div", { className: "h-6 bg-muted/30 rounded-md w-2/5" })] }), _jsxs("div", { className: "col-span-10 space-y-4", children: [_jsxs("div", { className: "flex gap-4", children: [_jsx("div", { className: "h-10 bg-primary/20 rounded-md w-32" }), _jsx("div", { className: "h-10 bg-muted/20 rounded-md flex-1" })] }), _jsx("div", { className: "h-12 bg-muted/20 rounded-lg" }), _jsx("div", { className: "space-y-2", children: [...Array(5)].map((_, i) => (_jsxs("div", { className: "h-14 bg-muted/15 rounded-lg flex items-center px-4 gap-4", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-primary/10" }), _jsxs("div", { className: "flex-1 space-y-1", children: [_jsx("div", { className: "h-3 bg-muted/30 rounded w-1/3" }), _jsx("div", { className: "h-2 bg-muted/20 rounded w-1/4" })] }), _jsx("div", { className: "h-6 w-20 bg-primary/10 rounded" })] }, i))) })] })] }) }), _jsxs("div", { className: "absolute top-8 right-8 p-4 bg-card/90 backdrop-blur border border-border/50 rounded-xl shadow-2xl", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx(RefreshCw, { className: "w-5 h-5 text-primary" }), _jsx("span", { className: "font-medium text-sm", children: "Last synced" })] }), _jsx("div", { className: "text-2xl font-semibold text-gradient", children: "12,847" }), _jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "subscribers synced" })] }), _jsxs("div", { className: "absolute bottom-8 left-8 p-3 bg-card/90 backdrop-blur border border-border/50 rounded-xl shadow-2xl flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center", children: _jsx(Download, { className: "w-5 h-5 text-primary" }) }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: "Export ready" }), _jsx("div", { className: "text-xs text-muted-foreground", children: "CSV, JSON, Excel" })] })] })] })] }) })] }) }), _jsx("div", { className: "animate-fade-up delay-700 flex flex-wrap justify-center gap-8 mt-16 text-sm text-muted-foreground", children: [
                            { icon: RefreshCw, text: 'Synced every day' },
                            { icon: Download, text: 'Export anytime' },
                            { icon: Shield, text: 'Secure & encrypted' },
                        ].map(({ icon: Icon, text }) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Icon, { className: "w-4 h-4 text-primary/60" }), _jsx("span", { children: text })] }, text))) })] })] }));
}
function PricingSection() {
    return (_jsx("section", { id: "pricing", className: "py-24 px-6 relative", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsxs("div", { className: "text-center mb-16", children: [_jsx("h2", { className: "text-4xl md:text-5xl font-medium tracking-tight mb-4", children: "Affordable pricing designed for everyone" }), _jsx("p", { className: "text-lg text-muted-foreground max-w-xl mx-auto", children: "We cover our costs while keeping it accessible. One plan, no hidden fees. Protecting your audience shouldn't break the bank." })] }), _jsx("div", { className: "max-w-lg mx-auto", children: _jsx("div", { className: "border-gradient hover-lift", children: _jsxs("div", { className: "bg-card rounded-xl p-8 md:p-10 relative overflow-hidden", children: [_jsx("div", { className: "absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" }), _jsxs("div", { className: "relative", children: [_jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6", children: [_jsx(Zap, { className: "w-3 h-3" }), "Pro Plan"] }), _jsxs("div", { className: "flex items-baseline gap-2 mb-2", children: [_jsx("span", { className: "text-6xl md:text-7xl font-medium tracking-tight", children: "$5" }), _jsx("span", { className: "text-muted-foreground text-lg", children: "/month" })] }), _jsxs("p", { className: "text-muted-foreground mb-8", children: ["For up to", ' ', _jsx("span", { className: "text-foreground font-medium", children: "10,000 subscribers" })] }), _jsx("ul", { className: "space-y-4 mb-8", children: [
                                                'Unlimited ESP connections',
                                                'Daily automatic sync',
                                                'Export to CSV, JSON, or Excel',
                                                'Always have a backup. Download your updated list anytime',
                                                'Import to another ESP if yours has issues',
                                                'Encrypted subscriber data',
                                                'Email support',
                                            ].map((feature) => (_jsxs("li", { className: "flex items-center gap-3", children: [_jsx(CheckCircle2, { className: "w-5 h-5 text-primary flex-shrink-0" }), _jsx("span", { children: feature })] }, feature))) }), _jsxs("div", { className: "p-4 rounded-lg bg-secondary/50 border border-border/50 mb-8", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("span", { className: "text-sm text-muted-foreground", children: "Need more subscribers?" }) }), _jsxs("div", { className: "mt-2 flex items-baseline gap-2", children: [_jsx("span", { className: "text-2xl font-semibold", children: "+$1" }), _jsx("span", { className: "text-muted-foreground text-sm", children: "per extra 10,000 subscribers" })] })] }), _jsx(Button, { size: "lg", className: "w-full gap-2 text-base h-14", asChild: true, children: _jsxs(Link, { href: "/login", children: ["Get Started ", _jsx(ArrowRight, { className: "w-4 h-4" })] }) })] })] }) }) }), _jsx("div", { className: "mt-12 grid grid-cols-1 md:grid-cols-3 gap-6", children: [
                        {
                            subscribers: '5,000',
                            price: '$5',
                            note: 'Base plan',
                        },
                        {
                            subscribers: '25,000',
                            price: '$7',
                            note: '$5 base + $2 extra',
                        },
                        {
                            subscribers: '100,000',
                            price: '$14',
                            note: '$5 base + $9 extra',
                        },
                    ].map(({ subscribers, price, note }) => (_jsxs("div", { className: "p-5 rounded-xl bg-card/50 border border-border/50 text-center hover-lift", children: [_jsxs("div", { className: "text-2xl font-semibold text-primary mb-1", children: [price, _jsx("span", { className: "text-sm text-muted-foreground font-normal", children: "/mo" })] }), _jsx("div", { className: "text-lg font-medium", children: subscribers }), _jsx("div", { className: "text-sm text-muted-foreground", children: note })] }, subscribers))) })] }) }));
}
function FAQSection() {
    const [openIndex, setOpenIndex] = useState(null);
    const faqs = [
        {
            question: 'What Email Service Providers do you support?',
            answer: `We support ${getFormattedEspList()}. If your ESP has an API, we can connect to it. Don't see yours? Contact us and we'll add support.`,
        },
        {
            question: 'Is my subscriber data secure?',
            answer: 'Absolutely. All data is encrypted both in transit (TLS 1.3) and at rest (AES-256). We never share, sell, or use your subscriber data for any purpose other than providing our service. Your data is yours.',
        },
        {
            question: 'How often does the sync happen?',
            answer: 'By default, we sync your subscriber list once every 24 hours. You can also trigger a manual sync anytime from your dashboard.',
        },
        {
            question: 'What happens if I go over my subscriber limit?',
            answer: "We'll never cut off your access. If your subscriber count exceeds 10,000, we'll simply charge $1 for each additional 10,000 subscribers at the end of the billing cycle. You'll always get a heads up before any charges.",
        },
        {
            question: 'Can I export my data anytime?',
            answer: 'Yes! Export your complete subscriber list anytime in CSV, JSON, or Excel format. There are no limits on exports. This is your data, and we make it easy to use however you need.',
        },
        {
            question: 'How does the backup and download feature protect my audience?',
            answer: 'Every day, we automatically sync and create a secure backup of your updated subscriber list. You can download this backup anytime. Think of it as insurance for your most valuable asset. If your ESP has technical issues, goes down, or you need to switch providers, you always have a current copy ready to import. Your audience is protected, no matter what happens with your ESP.',
        },
        {
            question: 'What if my ESP changes or I want to switch?',
            answer: "No problem. You can connect multiple ESPs and switch between them anytime. We keep historical data so you don't lose anything when transitioning between providers.",
        },
        {
            question: 'Do you offer refunds?',
            answer: "Yes. If you're not satisfied within the first 30 days, we'll refund your payment, no questions asked. We're confident you'll love SubscriberNest, but we want you to feel safe trying it out.",
        },
        {
            question: 'Is there a free tier?',
            answer: "We keep it simple with one affordable plan: $5/month for up to 10,000 subscribers. All features are included. A credit card is required to start, but our pricing is designed to be accessible to everyone. We cover our costs while keeping it affordable. Protecting your audience shouldn't break the bank.",
        },
    ];
    return (_jsx("section", { id: "faq", className: "py-24 px-6 relative", children: _jsxs("div", { className: "max-w-3xl mx-auto", children: [_jsxs("div", { className: "text-center mb-16", children: [_jsx("h2", { className: "text-4xl md:text-5xl font-medium tracking-tight mb-4", children: "Frequently asked questions" }), _jsx("p", { className: "text-lg text-muted-foreground max-w-xl mx-auto", children: "Got questions? We've got answers." })] }), _jsx("div", { className: "space-y-4", children: faqs.map((faq, index) => (_jsx("div", { className: "faq-item border-gradient cursor-pointer transition-transform hover:scale-[1.01]", onClick: () => setOpenIndex(openIndex === index ? null : index), children: _jsxs("div", { className: "bg-card rounded-xl overflow-hidden", children: [_jsxs("button", { className: "w-full p-6 flex items-center justify-between text-left", children: [_jsx("span", { className: "font-medium pr-4", children: faq.question }), _jsx(ChevronDown, { className: `w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}` })] }), _jsx("div", { className: `faq-answer ${openIndex === index ? 'open' : ''}`, children: _jsx("div", { children: _jsx("div", { className: "px-6 pb-6 text-muted-foreground leading-relaxed", children: faq.answer }) }) })] }) }, index))) }), _jsxs("div", { className: "mt-16 text-center", children: [_jsx("p", { className: "text-muted-foreground mb-6", children: "Still have questions?" }), _jsxs(Button, { variant: "outline", size: "lg", className: "gap-2", children: ["Contact us ", _jsx(ArrowRight, { className: "w-4 h-4" })] })] })] }) }));
}
function Footer() {
    return (_jsx("footer", { className: "py-12 px-6 border-t border-border/50", children: _jsxs("div", { className: "max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center", children: _jsx(Database, { className: "w-3 h-3 text-primary" }) }), _jsx("span", { className: "font-medium", children: "SubscriberNest" })] }), _jsxs("div", { className: "flex items-center gap-6 text-sm text-muted-foreground", children: [_jsx("a", { href: "#", className: "hover:text-foreground transition-colors", children: "Privacy" }), _jsx("a", { href: "#", className: "hover:text-foreground transition-colors", children: "Terms" }), _jsx("a", { href: "#", className: "hover:text-foreground transition-colors", children: "Contact" })] }), _jsxs("div", { className: "text-sm text-muted-foreground", children: ["\u00A9 ", new Date().getFullYear(), " SubscriberNest. All rights reserved."] })] }) }));
}
