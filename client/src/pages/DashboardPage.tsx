import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trophy, TrendingUp, TrendingDown, Minus, Star, Users, ShoppingCart, CreditCard } from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <Card data-testid={`card-stat-${label}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="w-3 h-3 stat-up" />;
  if (trend === "down") return <TrendingDown className="w-3 h-3 stat-down" />;
  return <Minus className="w-3 h-3 stat-stable" />;
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();

  const { data: teamData } = useQuery({ queryKey: ["/api/team"] });
  const { data: players } = useQuery<any[]>({ queryKey: ["/api/players"] });
  const { data: leaderboard } = useQuery<any[]>({ queryKey: ["/api/leaderboard"] });

  const topPlayers = players
    ? [...players].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 8)
    : [];

  const handlePayment = async () => {
    try {
      const res = await apiRequest("POST", "/api/payment/checkout");
      window.open(res.paymentUrl, "_blank");
    } catch {}
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">שלום, {user?.name} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">מונדיאל פנטזי 2026 – לוח בקרה</p>
        </div>
        {!user?.isPaid && (
          <Button onClick={handlePayment} data-testid="button-pay" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(43,90%,45%))" }}>
            <CreditCard className="w-4 h-4 ml-2" />
            שלם 300₪ ולהתחיל
          </Button>
        )}
      </div>

      {/* Payment banner if not paid */}
      {!user?.isPaid && (
        <Card style={{ border: "1px solid hsla(43,90%,50%,0.4)", background: "hsla(43,90%,50%,0.08)" }}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold" style={{ color: "hsl(var(--gold))" }}>הצטרף לתחרות!</p>
              <p className="text-sm text-muted-foreground">שלם 300₪ כדי להפעיל את חשבונך ולהתחיל לבנות נבחרת</p>
            </div>
            <Button onClick={handlePayment} size="sm" className="badge-gold shrink-0">
              תשלום עכשיו
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="הנקודות שלי" value={user?.totalPoints || 0} sub="כל הזמנים" icon={Star} color="hsl(var(--gold))" />
        <StatCard label="דירוג" value={user?.rank ? `#${user.rank}` : "—"} sub="מתוך משתתפים" icon={Trophy} color="hsl(155,60%,45%)" />
        <StatCard label="תקציב" value={`${user?.budget?.toFixed(0) || 100}`} sub="קרדיטים" icon={CreditCard} color="hsl(200,75%,55%)" />
        <StatCard label="שחקנים בנבחרת" value={teamData?.players?.length || 0} sub="מתוך 16" icon={Users} color="hsl(280,65%,65%)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top players */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              שחקנים בולטים השבוע
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {topPlayers.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3" data-testid={`row-top-player-${p.id}`}>
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(43,90%,40%))", color: "white" }}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.country} · {p.position}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={p.trend} />
                    <span className="text-sm font-bold text-primary">{p.totalPoints} נק'</span>
                    <span className={`text-xs ${p.priceChange > 0 ? 'stat-up' : p.priceChange < 0 ? 'stat-down' : 'stat-stable'}`}>
                      {p.priceChange > 0 ? '+' : ''}{p.priceChange?.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
              {topPlayers.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  עדיין אין נתוני שחקנים. מנהל יוסיף שחקנים בקרוב.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4" style={{ color: "hsl(var(--gold))" }} />
              טבלת הדירוג
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {(leaderboard || []).slice(0, 10).map((entry: any, i) => (
                <div key={entry.userId} className="flex items-center gap-3 px-4 py-2.5" data-testid={`row-leaderboard-${entry.userId}`}>
                  <span className={`text-xs font-bold w-5 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    #{entry.rank}
                  </span>
                  <p className="flex-1 text-sm font-medium truncate">{entry.userName}</p>
                  <span className="text-sm font-bold text-primary">{entry.totalPoints}</span>
                </div>
              ))}
              {(!leaderboard || leaderboard.length === 0) && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  טרם הוגדרו תוצאות
                </div>
              )}
            </div>
            <div className="p-4">
              <Link href="/leaderboard">
                <a className="block text-center text-xs text-primary hover:underline">ראה טבלה מלאה</a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/pitch">
          <a>
            <Card className="player-card cursor-pointer hover:bg-secondary transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">הנבחרת שלי</p>
                  <p className="text-xs text-muted-foreground">ערוך את הסגל</p>
                </div>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/market">
          <a>
            <Card className="player-card cursor-pointer hover:bg-secondary transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: "hsla(43,90%,50%,0.2)" }}>
                  <ShoppingCart className="w-5 h-5" style={{ color: "hsl(var(--gold))" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">שוק שחקנים</p>
                  <p className="text-xs text-muted-foreground">קנה ומכור שחקנים</p>
                </div>
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>
    </div>
  );
}
