'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ChevronDown,
  Database,
  Download,
  RefreshCw,
  Shield,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen nest-pattern grain-overlay">
      <Navigation />
      <HeroSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
}

function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 animate-fade-in">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Database className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-lg tracking-tight">
            SubscriberNest
          </span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            FAQ
          </a>
          <Button size="sm" className="gap-2" asChild>
            <Link href="/login">
              Get Started <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8">
            <Shield className="w-3.5 h-3.5" />
            <span>Protect your most valuable asset</span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up delay-100 text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.1] mb-6">
            Keep your audience{' '}
            <span className="text-gradient italic">safe</span> and backed up
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-up delay-200 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Your audience is your most valuable asset—keep it safe. We sync
            daily to maintain a secure backup of your updated list. Download
            anytime or import to another ESP if yours has issues. Your
            subscribers, always protected.
          </p>

          {/* CTA */}
          <div className="animate-fade-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="gap-2 text-base px-8 h-14 animate-pulse-glow"
              asChild
            >
              <Link href="/login">
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Credit card required to start
            </span>
          </div>
        </div>

        {/* Screenshot placeholder */}
        <div className="animate-fade-up delay-500 relative max-w-4xl mx-auto">
          <div className="relative animate-float">
            {/* Glow effect behind screenshot */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent rounded-2xl blur-2xl -z-10 scale-95" />

            {/* Screenshot card */}
            <div className="border-gradient hover-lift">
              <div className="bg-card rounded-xl overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 bg-secondary/50 rounded-md text-xs text-muted-foreground">
                      app.subscribernest.com
                    </div>
                  </div>
                  <div className="w-[52px]" />
                </div>

                {/* Screenshot content placeholder */}
                <div className="aspect-[16/9] bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center relative overflow-hidden">
                  {/* Placeholder grid pattern */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="grid grid-cols-12 gap-4 p-8 h-full">
                      {/* Sidebar */}
                      <div className="col-span-2 space-y-3">
                        <div className="h-8 bg-primary/10 rounded-md animate-shimmer" />
                        <div className="h-6 bg-muted/30 rounded-md w-4/5" />
                        <div className="h-6 bg-muted/30 rounded-md w-3/5" />
                        <div className="h-6 bg-muted/30 rounded-md w-4/5" />
                        <div className="h-6 bg-muted/30 rounded-md w-2/5" />
                      </div>
                      {/* Main content */}
                      <div className="col-span-10 space-y-4">
                        <div className="flex gap-4">
                          <div className="h-10 bg-primary/20 rounded-md w-32" />
                          <div className="h-10 bg-muted/20 rounded-md flex-1" />
                        </div>
                        <div className="h-12 bg-muted/20 rounded-lg" />
                        <div className="space-y-2">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="h-14 bg-muted/15 rounded-lg flex items-center px-4 gap-4"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10" />
                              <div className="flex-1 space-y-1">
                                <div className="h-3 bg-muted/30 rounded w-1/3" />
                                <div className="h-2 bg-muted/20 rounded w-1/4" />
                              </div>
                              <div className="h-6 w-20 bg-primary/10 rounded" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating elements */}
                  <div className="absolute top-8 right-8 p-4 bg-card/90 backdrop-blur border border-border/50 rounded-xl shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <RefreshCw className="w-5 h-5 text-primary" />
                      <span className="font-medium text-sm">Last synced</span>
                    </div>
                    <div className="text-2xl font-semibold text-gradient">
                      12,847
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      subscribers synced
                    </div>
                  </div>

                  <div className="absolute bottom-8 left-8 p-3 bg-card/90 backdrop-blur border border-border/50 rounded-xl shadow-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Download className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Export ready</div>
                      <div className="text-xs text-muted-foreground">
                        CSV, JSON, Excel
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features row */}
        <div className="animate-fade-up delay-700 flex flex-wrap justify-center gap-8 mt-16 text-sm text-muted-foreground">
          {[
            { icon: RefreshCw, text: 'Synced every day' },
            { icon: Download, text: 'Export anytime' },
            { icon: Shield, text: 'Secure & encrypted' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary/60" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">
            Affordable pricing designed for everyone
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            We cover our costs while keeping it accessible. One plan, no hidden
            fees—protecting your audience shouldn't break the bank.
          </p>
        </div>

        {/* Pricing card */}
        <div className="max-w-lg mx-auto">
          <div className="border-gradient hover-lift">
            <div className="bg-card rounded-xl p-8 md:p-10 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative">
                {/* Plan name */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
                  <Zap className="w-3 h-3" />
                  Pro Plan
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-6xl md:text-7xl font-medium tracking-tight">
                    $5
                  </span>
                  <span className="text-muted-foreground text-lg">/month</span>
                </div>

                <p className="text-muted-foreground mb-8">
                  For up to{' '}
                  <span className="text-foreground font-medium">
                    10,000 subscribers
                  </span>
                </p>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {[
                    'Unlimited ESP connections',
                    'Daily automatic sync',
                    'Export to CSV, JSON, or Excel',
                    'Encrypted subscriber data',
                    'Email support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Additional usage */}
                <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Need more subscribers?
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">+$1</span>
                    <span className="text-muted-foreground text-sm">
                      per extra 10,000 subscribers
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  size="lg"
                  className="w-full gap-2 text-base h-14"
                  asChild
                >
                  <Link href="/login">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>

                <p className="text-center text-sm text-muted-foreground mt-4">
                  Credit card required to start
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage examples */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
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
          ].map(({ subscribers, price, note }) => (
            <div
              key={subscribers}
              className="p-5 rounded-xl bg-card/50 border border-border/50 text-center hover-lift"
            >
              <div className="text-2xl font-semibold text-primary mb-1">
                {price}
                <span className="text-sm text-muted-foreground font-normal">
                  /mo
                </span>
              </div>
              <div className="text-lg font-medium">{subscribers}</div>
              <div className="text-sm text-muted-foreground">{note}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'What Email Service Providers do you support?',
      answer:
        "We support all major ESPs including Mailchimp, ConvertKit, Beehiiv, Substack, Buttondown, AWeber, and many more. If your ESP has an API, we can connect to it. Don't see yours? Contact us and we'll add support.",
    },
    {
      question: 'Is my subscriber data secure?',
      answer:
        'Absolutely. All data is encrypted both in transit (TLS 1.3) and at rest (AES-256). We never share, sell, or use your subscriber data for any purpose other than providing our service. Your data is yours.',
    },
    {
      question: 'How often does the sync happen?',
      answer:
        'By default, we sync your subscriber list once every 24 hours. You can also trigger a manual sync anytime from your dashboard. Pro tip: set up webhooks with your ESP for real-time sync if they support it.',
    },
    {
      question: 'What happens if I go over my subscriber limit?',
      answer:
        "We'll never cut off your access. If your subscriber count exceeds 10,000, we'll simply charge $1 for each additional 10,000 subscribers at the end of the billing cycle. You'll always get a heads up before any charges.",
    },
    {
      question: 'Can I export my data anytime?',
      answer:
        'Yes! Export your complete subscriber list anytime in CSV, JSON, or Excel format. There are no limits on exports. This is your data — we make it easy to use however you need.',
    },
    {
      question: 'What if my ESP changes or I want to switch?',
      answer:
        "No problem. You can connect multiple ESPs and switch between them anytime. We keep historical data so you don't lose anything when transitioning between providers.",
    },
    {
      question: 'Do you offer refunds?',
      answer:
        "Yes. If you're not satisfied within the first 30 days, we'll refund your payment — no questions asked. We're confident you'll love SubscriberNest, but we want you to feel safe trying it out.",
    },
    {
      question: 'Is there a free tier?',
      answer:
        "We offer a 14-day free trial with full access to all features. After that, it's $5/month for up to 10,000 subscribers. We keep it simple — one plan with all features included.",
    },
  ];

  return (
    <section id="faq" className="py-24 px-6 relative">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Got questions? We've got answers.
          </p>
        </div>

        {/* FAQ list */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="faq-item border-gradient cursor-pointer transition-transform hover:scale-[1.01]"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <div className="bg-card rounded-xl overflow-hidden">
                <button className="w-full p-6 flex items-center justify-between text-left">
                  <span className="font-medium pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`faq-answer ${openIndex === index ? 'open' : ''}`}
                >
                  <div>
                    <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-6">Still have questions?</p>
          <Button variant="outline" size="lg" className="gap-2">
            Contact us <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border/50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Database className="w-3 h-3 text-primary" />
          </div>
          <span className="font-medium">SubscriberNest</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Contact
          </a>
        </div>

        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} SubscriberNest. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
