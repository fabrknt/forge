"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { useSession, signOut } from "next-auth/react";
import { LogIn, LogOut, Github, Menu, X, HelpCircle, Info, ExternalLink, BarChart3, Package } from "lucide-react";

const NAV_LINKS = [
    { href: "/guide", label: "Guide", icon: HelpCircle, matchPaths: ["/guide"] },
    { href: "/about", label: "About", icon: Info, matchPaths: ["/about"] },
];

const EXTERNAL_NAV = [
    { href: "https://fabrknt.com", label: "Scorecard", icon: BarChart3 },
    { href: "https://fabrknt.com/products", label: "Products", icon: Package },
];

export function CurateLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActivePath = (matchPaths: string[]) => matchPaths.includes(pathname);

    return (
        <div className="min-h-screen bg-gradient-to-b from-muted to-background">
            {/* Top Menu Bar */}
            <header className="border-b border-border bg-card sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Hamburger Menu Button - Mobile only */}
                            <button
                                onClick={() => setMenuOpen(true)}
                                className="md:hidden p-2 -ml-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                aria-label="Open menu"
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            <Logo size="sm" />

                            {/* Navigation - Desktop only */}
                            <nav className="hidden md:flex items-center gap-1">
                                {NAV_LINKS.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                            isActivePath(link.matchPaths)
                                                ? "bg-muted text-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                <div className="h-4 w-px bg-border mx-1" />
                                {EXTERNAL_NAV.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        {link.label}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                ))}
                            </nav>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Social Links - Desktop only */}
                            <a
                                href="https://x.com/fabrknt"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors hidden md:block"
                                aria-label="X (Twitter)"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                            <a
                                href="https://github.com/fabrknt"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors hidden md:block"
                                aria-label="GitHub"
                            >
                                <Github className="h-5 w-5" />
                            </a>

                            {/* Divider - Desktop only */}
                            <div className="hidden md:block h-5 w-px bg-border" />

                            {/* Auth UI */}
                            {status === "loading" ? (
                                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                            ) : session ? (
                                <div className="flex items-center gap-2">
                                    <div className="hidden md:flex flex-col items-end">
                                        <span className="text-xs font-medium text-foreground">
                                            {session.user?.name || session.user?.email}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            Signed in
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => signOut({ callbackUrl: "/" })}
                                        className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                        title="Sign Out"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    href="/auth/signin"
                                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-500 text-white hover:bg-cyan-400 transition-colors text-sm font-medium"
                                >
                                    <LogIn className="h-4 w-4" />
                                    <span className="hidden sm:inline">Sign In</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Slide-out Menu */}
            {menuOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 z-50 md:hidden"
                        onClick={() => setMenuOpen(false)}
                    />

                    {/* Menu Panel */}
                    <div className="fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-border z-50 md:hidden animate-in slide-in-from-left duration-200">
                        {/* Menu Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <Logo size="sm" />
                            <button
                                onClick={() => setMenuOpen(false)}
                                className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                aria-label="Close menu"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav className="p-4 space-y-1">
                            {NAV_LINKS.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                            isActivePath(link.matchPaths)
                                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Divider */}
                        <div className="mx-4 border-t border-border" />

                        {/* Fabrknt Links */}
                        <div className="p-4 space-y-1">
                            <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Fabrknt
                            </p>
                            {EXTERNAL_NAV.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                        <Icon className="h-5 w-5" />
                                        {link.label}
                                        <ExternalLink className="h-3 w-3 ml-auto" />
                                    </a>
                                );
                            })}
                        </div>

                        {/* Divider */}
                        <div className="mx-4 border-t border-border" />

                        {/* Social Links */}
                        <div className="p-4 space-y-1">
                            <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Connect
                            </p>
                            <a
                                href="https://x.com/fabrknt"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                X (Twitter)
                            </a>
                            <a
                                href="https://github.com/fabrknt"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <Github className="h-5 w-5" />
                                GitHub
                            </a>
                        </div>

                        {/* User Info (if signed in) */}
                        {session && (
                            <>
                                <div className="mx-4 border-t border-border" />
                                <div className="p-4">
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50">
                                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                            <span className="text-cyan-400 text-sm font-medium">
                                                {(session.user?.name || session.user?.email || "U")[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {session.user?.name || session.user?.email}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Signed in</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Page Content - Full width, no sidebar */}
            <main className="container mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    );
}
