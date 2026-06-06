import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Users, DollarSign, Database, Plus, CheckCircle, AlertTriangle, CreditCard, UserCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Redirect non-admins
  if (!user?.isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-destructive opacity-60" />
            <p className="text-muted-foreground">אין לך הרשאות מנהל</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/stats"] });
  const { data: players = [] } = useQuery<any[]>({ queryKey: ["/api/players"] });
  const { data: coaches = [] } = useQuery<any[]>({ queryKey: ["/api/coaches"] });

  const seedMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/seed-players"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: `✅ ${data.players} שחקנים + ${data.coaches} מאמנים מ-${data.teams} קבוצות!` });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  // Matchday points form
  const [matchdayForm, setMatchdayForm] = useState({
    playerId: "", matchday: "1", matchDate: new Date().toISOString().split("T")[0],
    opponent: "", goals: "0", assists: "0", yellowCards: "0", redCards: "0",
    cleanSheet: false, minutesPlayed: "90", saves: "0",
  });

  const matchdayMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/matchday", {
      playerId: parseInt(matchdayForm.playerId),
      matchday: parseInt(matchdayForm.matchday),
      matchDate: matchdayForm.matchDate,
      opponent: matchdayForm.opponent,
      goals: parseInt(matchdayForm.goals),
      assists: parseInt(matchdayForm.assists),
      yellowCards: parseInt(matchdayForm.yellowCards),
      redCards: parseInt(matchdayForm.redCards),
      cleanSheet: matchdayForm.cleanSheet,
      minutesPlayed: parseInt(matchdayForm.minutesPlayed),
      saves: parseInt(matchdayForm.saves),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: `נקודות עודכנו: ${data.pointsScored} נקודות` });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold font-display flex items-center gap-2">
        ניהול המערכת
        <Badge variant="destructive" className="text-xs">Admin</Badge>
      </h1>

      {/* Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "משתמשים רשומים", value: stats.totalUsers, icon: Users, color: "hsl(200,75%,55%)" },
              { label: "משלמים", value: stats.paidUsers, icon: CheckCircle, color: "hsl(155,60%,45%)" },
              { label: "הכנסות", value: `${stats.revenue?.toLocaleString()}₪`, icon: DollarSign, color: "hsl(43,90%,50%)" },
              { label: "רווח שלך (40%)", value: `${stats.adminEarnings?.toFixed(0) || 0}₪`, icon: DollarSign, color: "hsl(43,90%,60%)" },
              { label: "שחקנים", value: stats.totalPlayers, icon: Database, color: "hsl(280,65%,65%)" },
              { label: "מאמנים", value: stats.totalCoaches, icon: UserCheck, color: "hsl(155,60%,55%)" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: `${s.color}20` }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* PayPlus status banner */}
          <Card style={{ border: `1px solid ${stats.payplusConnected ? 'hsla(155,60%,45%,0.5)' : 'hsla(43,90%,50%,0.4)'}` }}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5" style={{ color: stats.payplusConnected ? 'hsl(155,60%,45%)' : 'hsl(43,90%,50%)' }} />
                <div>
                  <p className="text-sm font-semibold">
                    {stats.payplusConnected ? '✅ PayPlus מחובר — תשלומים אמיתיים פעילים' : '⚠️ PayPlus לא מחובר — מצב הדגמה'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.payplusConnected
                      ? 'כל תשלום של 300₪ מתקבל אוטומטית ונשלחת חשבונית'
                      : 'הוסף PAYPLUS_API_KEY ו-PAYPLUS_SECRET ב-Railway Variables להפעלה'}
                  </p>
                </div>
              </div>
              {!stats.payplusConnected && (
                <Button size="sm" variant="outline" onClick={() => window.open('https://payplus.co.il', '_blank')}>
                  פתח PayPlus
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seed players */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">הוסף שחקני מונדיאל</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              לחץ כדי להוסיף {players.length === 0 ? "30+ שחקנים" : "שחקנים נוספים"} מכל מדינות המונדיאל
            </p>
            <Button onClick={() => seedMut.mutate()} disabled={seedMut.isPending} data-testid="button-seed-players">
              <Plus className="w-4 h-4 ml-2" />
              {seedMut.isPending ? "מוסיף..." : "הוסף שחקנים"}
            </Button>
            <p className="text-xs text-muted-foreground">שחקנים קיימים: {(players as any[]).length}</p>
          </CardContent>
        </Card>

        {/* Add matchday result */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">הוסף תוצאות משחק</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">שחקן</Label>
                <Select value={matchdayForm.playerId} onValueChange={v => setMatchdayForm(f => ({ ...f, playerId: v }))}>
                  <SelectTrigger data-testid="select-player-matchday">
                    <SelectValue placeholder="בחר שחקן" />
                  </SelectTrigger>
                  <SelectContent>
                    {(players as any[]).map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">תאריך</Label>
                <Input type="date" value={matchdayForm.matchDate} onChange={e => setMatchdayForm(f => ({ ...f, matchDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">שערים</Label>
                <Input type="number" min="0" value={matchdayForm.goals} onChange={e => setMatchdayForm(f => ({ ...f, goals: e.target.value }))} data-testid="input-goals" />
              </div>
              <div>
                <Label className="text-xs">בישולים</Label>
                <Input type="number" min="0" value={matchdayForm.assists} onChange={e => setMatchdayForm(f => ({ ...f, assists: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">דקות משחק</Label>
                <Input type="number" min="0" max="120" value={matchdayForm.minutesPlayed} onChange={e => setMatchdayForm(f => ({ ...f, minutesPlayed: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">שמירות (שוער)</Label>
                <Input type="number" min="0" value={matchdayForm.saves} onChange={e => setMatchdayForm(f => ({ ...f, saves: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">כרטיס צהוב</Label>
                <Input type="number" min="0" max="1" value={matchdayForm.yellowCards} onChange={e => setMatchdayForm(f => ({ ...f, yellowCards: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">כרטיס אדום</Label>
                <Input type="number" min="0" max="1" value={matchdayForm.redCards} onChange={e => setMatchdayForm(f => ({ ...f, redCards: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={matchdayForm.cleanSheet}
                onChange={e => setMatchdayForm(f => ({ ...f, cleanSheet: e.target.checked }))} />
              שמר עפיפון (Clean Sheet)
            </label>
            <Button className="w-full" onClick={() => matchdayMut.mutate()}
              disabled={!matchdayForm.playerId || matchdayMut.isPending} data-testid="button-submit-matchday">
              {matchdayMut.isPending ? "שומר..." : "עדכן נקודות"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
