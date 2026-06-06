import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, LayoutDashboard, Users, ShoppingCart, Instagram, Settings, LogOut, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/", label: "ראשי", icon: LayoutDashboard },
  { href: "/pitch", label: "הנבחרת", icon: Users },
  { href: "/market", label: "שוק", icon: ShoppingCart },
  { href: "/leaderboard", label: "דירוג", icon: Trophy },
  { href: "/prizes", label: "פרסים", icon: Gift },
  { href: "/instagram", label: "אינסטגרם", icon: Instagram },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-l border-border flex flex-col" style={{ borderLeft: "1px solid hsl(var(--border))" }}>
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(43,90%,45%))" }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5"/>
                <path d="M12 2C12 2 8 6 8 12C8 18 12 22 12 22" stroke="white" strokeWidth="1.5"/>
                <path d="M12 2C12 2 16 6 16 12C16 18 12 22 12 22" stroke="white" strokeWidth="1.5"/>
                <path d="M2 12H22" stroke="white" strokeWidth="1.5"/>
                <path d="M3.5 7H20.5" stroke="white" strokeWidth="1.2"/>
                <path d="M3.5 17H20.5" stroke="white" strokeWidth="1.2"/>
              </svg>
            </div>
            <div>
              <h1 className="font-display text-sm font-bold text-foreground">מונדיאל פנטזי</h1>
              <p className="text-xs text-muted-foreground">2026</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-border">
          <div className="glass rounded-lg p-3">
            <p className="text-sm font-semibold text-foreground">{user?.name}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">תקציב</span>
              <span className="text-xs font-bold" style={{ color: "hsl(var(--gold))" }}>
                {user?.budget?.toFixed(1)} קרדיטים
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">נקודות</span>
              <span className="text-xs font-bold text-primary">{user?.totalPoints}</span>
            </div>
            {!user?.isPaid && (
              <Badge className="mt-2 w-full justify-center text-xs" variant="destructive">
                לא שולם
              </Badge>
            )}
            {user?.isPaid && (
              <Badge className="mt-2 w-full justify-center text-xs badge-gold">
                ✓ מנוי פעיל
              </Badge>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </a>
              </Link>
            );
          })}
          {user?.isAdmin && (
            <Link href="/admin">
              <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                location === "/admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
                <Settings className="w-4 h-4 shrink-0" />
                ניהול
              </a>
            </Link>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={logout} data-testid="button-logout">
            <LogOut className="w-4 h-4" />
            יציאה
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
