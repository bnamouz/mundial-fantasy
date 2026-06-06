import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Search, ShoppingCart, Flag } from "lucide-react";

const FLAG_EMOJI: Record<string, string> = {
  BRA: "🇧🇷", FRA: "🇫🇷", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", ARG: "🇦🇷", POR: "🇵🇹",
  ESP: "🇪🇸", GER: "🇩🇪", NED: "🇳🇱", MAR: "🇲🇦", NOR: "🇳🇴",
};

const POS_COLOR: Record<string, string> = {
  GK: "text-yellow-400", DEF: "text-blue-400", MID: "text-purple-400", FWD: "text-red-400",
};

const POS_LABEL: Record<string, string> = {
  GK: "שוער", DEF: "בלם", MID: "קשר", FWD: "חלוץ",
};

export default function MarketPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("points");

  const { data: players = [] } = useQuery<any[]>({ queryKey: ["/api/players"] });
  const { data: teamData } = useQuery<any>({ queryKey: ["/api/team"] });
  const ownedIds = new Set((teamData?.players || []).map((p: any) => p.playerId));

  const buyMut = useMutation({
    mutationFn: (playerId: number) => apiRequest("POST", "/api/team/buy", { playerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refreshUser();
      toast({ title: "שחקן נקנה!", description: "השחקן נוסף לנבחרת שלך" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  const sellMut = useMutation({
    mutationFn: (playerId: number) => apiRequest("POST", "/api/team/sell", { playerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refreshUser();
      toast({ title: "שחקן נמכר" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  const countries = [...new Set((players as any[]).map((p: any) => p.countryCode))];

  const filtered = (players as any[])
    .filter(p => {
      const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.nameHe && p.nameHe.includes(search)) || (p.nameAr && p.nameAr.includes(search));
      const matchPos = posFilter === "all" || p.position === posFilter;
      const matchCountry = countryFilter === "all" || p.countryCode === countryFilter;
      return matchSearch && matchPos && matchCountry;
    })
    .sort((a, b) => {
      if (sortBy === "points") return b.totalPoints - a.totalPoints;
      if (sortBy === "price") return b.price - a.price;
      if (sortBy === "trend") return (b.priceChange || 0) - (a.priceChange || 0);
      return 0;
    });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-display">שוק שחקנים</h1>
          <p className="text-sm text-muted-foreground">קנה ומכור שחקנים לנבחרתך</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          💰 תקציב: <span className="font-bold mr-1" style={{ color: "hsl(var(--gold))" }}>{user?.budget?.toFixed(1)}</span> קרדיטים
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש שחקן..." className="pr-9" data-testid="input-search-player" />
        </div>
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-36" data-testid="select-position">
            <SelectValue placeholder="עמדה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל העמדות</SelectItem>
            <SelectItem value="GK">שוערים</SelectItem>
            <SelectItem value="DEF">בלמים</SelectItem>
            <SelectItem value="MID">קשרים</SelectItem>
            <SelectItem value="FWD">חלוצים</SelectItem>
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-36" data-testid="select-country">
            <SelectValue placeholder="מדינה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המדינות</SelectItem>
            {countries.map(c => (
              <SelectItem key={c} value={c}>{FLAG_EMOJI[c] || "🏳"} {c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36" data-testid="select-sort">
            <SelectValue placeholder="מיין" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="points">לפי נקודות</SelectItem>
            <SelectItem value="price">לפי מחיר</SelectItem>
            <SelectItem value="trend">לפי מגמה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((player: any) => {
          const owned = ownedIds.has(player.id);
          const canBuy = !owned && user?.isPaid && (user?.budget || 0) >= player.price;

          return (
            <Card key={player.id} className={`player-card transition-all ${owned ? 'ring-1 ring-primary' : ''}`} data-testid={`card-player-${player.id}`}>
              <CardContent className="p-4">
                {/* Player header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0"
                      style={{ background: `linear-gradient(135deg, hsl(155,60%,30%), hsl(43,90%,35%))` }}>
                      {player.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {FLAG_EMOJI[player.countryCode] || "🏳"} {player.country}
                      </p>
                    </div>
                  </div>
                  {owned && <Badge className="text-xs shrink-0" style={{ background: "hsla(155,60%,38%,0.2)", color: "hsl(155,60%,55%)" }}>✓ בנבחרת</Badge>}
                </div>

                {/* Position + trend */}
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className={`text-xs ${POS_COLOR[player.position]}`}>
                    {POS_LABEL[player.position]}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {player.trend === "up" && <TrendingUp className="w-3 h-3 stat-up" />}
                    {player.trend === "down" && <TrendingDown className="w-3 h-3 stat-down" />}
                    {player.trend === "stable" && <Minus className="w-3 h-3 stat-stable" />}
                    <span className={`text-xs font-medium ${player.trend === "up" ? "stat-up" : player.trend === "down" ? "stat-down" : "stat-stable"}`}>
                      {player.priceChange > 0 ? "+" : ""}{player.priceChange?.toFixed(1) || "0.0"}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-xs text-muted-foreground">נקודות</p>
                    <p className="text-sm font-bold text-primary">{player.totalPoints}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-xs text-muted-foreground">שערים</p>
                    <p className="text-sm font-bold">{player.goals}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-xs text-muted-foreground">בישולים</p>
                    <p className="text-sm font-bold">{player.assists}</p>
                  </div>
                </div>

                {/* Price + action */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--gold))" }}>
                    {player.price.toFixed(1)} קרד'
                  </span>
                  {owned ? (
                    <Button size="sm" variant="destructive" onClick={() => sellMut.mutate(player.id)}
                      disabled={sellMut.isPending} data-testid={`button-sell-${player.id}`}>
                      מכור
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => buyMut.mutate(player.id)}
                      disabled={!canBuy || buyMut.isPending} data-testid={`button-buy-${player.id}`}
                      style={{ background: canBuy ? "hsl(var(--primary))" : undefined }}>
                      <ShoppingCart className="w-3 h-3 ml-1" />
                      קנה
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            לא נמצאו שחקנים
          </div>
        )}
      </div>
    </div>
  );
}
