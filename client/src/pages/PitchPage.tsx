import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Shield, Sword, Activity, Star, X } from "lucide-react";

const POSITION_COLORS: Record<string, string> = {
  GK: "hsl(43,90%,50%)",
  DEF: "hsl(200,75%,55%)",
  MID: "hsl(280,65%,65%)",
  FWD: "hsl(0,75%,60%)",
};

const POSITION_LABELS: Record<string, string> = {
  GK: "שוער", DEF: "בלם", MID: "קשר", FWD: "חלוץ",
};

function PlayerSpot({ player, onRemove, isBench }: { player?: any; onRemove?: () => void; isBench?: boolean }) {
  if (!player) {
    return (
      <div className={`flex flex-col items-center gap-1 opacity-40`}>
        <div className={`w-12 h-12 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center`}>
          <Plus className="w-4 h-4 text-white/50" />
        </div>
        <span className="text-xs text-white/50">פנוי</span>
      </div>
    );
  }

  const color = POSITION_COLORS[player.player?.position] || "hsl(155,60%,45%)";

  return (
    <div className="flex flex-col items-center gap-1 group relative" data-testid={`player-spot-${player.playerId}`}>
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}88)`, borderColor: color }}>
          {player.player?.name?.charAt(0) || "?"}
        </div>
        {player.playerId === player.captainId && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(var(--gold))", color: "#000" }}>C</div>
        )}
        {onRemove && (
          <button onClick={onRemove}
            className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-destructive text-white hidden group-hover:flex items-center justify-center">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-white leading-tight max-w-16 truncate">
          {player.player?.name?.split(" ").pop() || "?"}
        </p>
        <p className="text-xs font-bold" style={{ color }}>
          {player.player?.totalPoints || 0}
        </p>
      </div>
    </div>
  );
}

export default function PitchPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");
  const [coachName, setCoachName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: teamData, isLoading } = useQuery<any>({ queryKey: ["/api/team"] });
  const team = teamData?.team;
  const teamPlayers = teamData?.players || [];

  const starters = teamPlayers.filter((p: any) => !p.isBench);
  const bench = teamPlayers.filter((p: any) => p.isBench);

  // Group starters by position
  const gks = starters.filter((p: any) => p.player?.position === "GK");
  const defs = starters.filter((p: any) => p.player?.position === "DEF");
  const mids = starters.filter((p: any) => p.player?.position === "MID");
  const fwds = starters.filter((p: any) => p.player?.position === "FWD");

  const createTeamMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/team", { teamName, coachName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setCreating(false);
      toast({ title: "הנבחרת נוצרה!" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  const sellMut = useMutation({
    mutationFn: (playerId: number) => apiRequest("POST", "/api/team/sell", { playerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "שחקן נמכר" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  if (!user?.isPaid) {
    return (
      <div className="p-6">
        <Card style={{ border: "1px solid hsla(43,90%,50%,0.4)" }}>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-bold mb-2" style={{ color: "hsl(var(--gold))" }}>נדרש תשלום</p>
            <p className="text-muted-foreground">שלם 300₪ כדי לבנות את הנבחרת שלך</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">טוען...</div>;

  if (!team) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold mb-6">יצירת נבחרת</h1>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>שם הנבחרת</Label>
                <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="הנבחרת שלי" data-testid="input-team-name" />
              </div>
              <div>
                <Label>שם המאמן</Label>
                <Input value={coachName} onChange={e => setCoachName(e.target.value)} placeholder="שם המאמן" data-testid="input-coach-name" />
              </div>
              <Button className="w-full" onClick={() => createTeamMut.mutate()} disabled={!teamName || createTeamMut.isPending} data-testid="button-create-team">
                {createTeamMut.isPending ? "יוצר..." : "צור נבחרת"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-display">{team.teamName}</h1>
          {team.coachName && <p className="text-sm text-muted-foreground">מאמן: {team.coachName}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{team.formation}</Badge>
          <Badge style={{ background: "hsla(43,90%,50%,0.2)", color: "hsl(var(--gold))" }}>
            {team.totalPoints} נקודות
          </Badge>
          <Button size="sm" variant="outline" asChild>
            <a href="#/market">+ הוסף שחקן</a>
          </Button>
        </div>
      </div>

      {/* Football Pitch */}
      <Card className="overflow-hidden">
        <div className="pitch-bg relative" style={{ minHeight: "520px", padding: "24px 16px" }}>
          {/* Pitch markings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/10 rounded-full" style={{ width: "180px", height: "180px" }} />
          </div>
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />

          {/* Forwards */}
          <div className="flex justify-around items-center mb-8" style={{ minHeight: "80px" }}>
            {fwds.length > 0 ? fwds.map((p: any) => (
              <PlayerSpot key={p.id} player={{ ...p, captainId: team.captainId }} onRemove={() => sellMut.mutate(p.playerId)} />
            )) : [0, 1, 2].map(i => <PlayerSpot key={i} />)}
          </div>

          {/* Midfielders */}
          <div className="flex justify-around items-center mb-8" style={{ minHeight: "80px" }}>
            {mids.length > 0 ? mids.map((p: any) => (
              <PlayerSpot key={p.id} player={{ ...p, captainId: team.captainId }} onRemove={() => sellMut.mutate(p.playerId)} />
            )) : [0, 1, 2, 3].map(i => <PlayerSpot key={i} />)}
          </div>

          {/* Defenders */}
          <div className="flex justify-around items-center mb-8" style={{ minHeight: "80px" }}>
            {defs.length > 0 ? defs.map((p: any) => (
              <PlayerSpot key={p.id} player={{ ...p, captainId: team.captainId }} onRemove={() => sellMut.mutate(p.playerId)} />
            )) : [0, 1, 2, 3].map(i => <PlayerSpot key={i} />)}
          </div>

          {/* Goalkeeper */}
          <div className="flex justify-around items-center" style={{ minHeight: "80px" }}>
            {gks.length > 0 ? gks.map((p: any) => (
              <PlayerSpot key={p.id} player={{ ...p, captainId: team.captainId }} onRemove={() => sellMut.mutate(p.playerId)} />
            )) : [<PlayerSpot key={0} />]}
          </div>
        </div>
      </Card>

      {/* Bench */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">ספסל המחליפים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 flex-wrap">
            {bench.length > 0 ? bench.map((p: any) => (
              <div key={p.id} className="flex flex-col items-center gap-1 player-card" data-testid={`bench-player-${p.playerId}`}>
                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${POSITION_COLORS[p.player?.position] || "hsl(155,60%,45%)"}88, transparent)`, borderColor: POSITION_COLORS[p.player?.position] || "hsl(155,60%,45%)" }}>
                  {p.player?.name?.charAt(0)}
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-14 truncate">{p.player?.name?.split(" ").pop()}</p>
                <Badge className="text-xs" variant="outline">{POSITION_LABELS[p.player?.position] || p.player?.position}</Badge>
                <button onClick={() => sellMut.mutate(p.playerId)} className="text-xs text-destructive hover:underline">מכור</button>
              </div>
            )) : [0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center gap-1 opacity-30">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground" />
                <p className="text-xs text-muted-foreground">פנוי</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "שחקנים", value: starters.length + "/" + 11, icon: Shield },
          { label: "ספסל", value: bench.length + "/5", icon: Activity },
          { label: "נקודות", value: team.totalPoints, icon: Star },
          { label: "השבוע", value: team.weeklyPoints, icon: Sword },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-2">
              <s.icon className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
