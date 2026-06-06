import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Gift, Target, CheckCircle, Clock, Banknote, Plus } from "lucide-react";

const GOLD = "hsl(43,90%,50%)";
const SILVER = "hsl(0,0%,70%)";
const BRONZE = "hsl(25,70%,55%)";
const PLACE_COLORS: Record<number, string> = { 1: GOLD, 2: SILVER, 3: BRONZE };

function PrizeBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function PrizesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [predictMatch, setPredictMatch] = useState("");
  const [predictScore, setPredictScore] = useState("");
  const [payMethod, setPayMethod] = useState("bit");
  const [payDetails, setPayDetails] = useState("");

  const { data: prizes } = useQuery<any>({ queryKey: ["/api/prizes"] });
  const { data: predictions = [] } = useQuery<any[]>({ queryKey: ["/api/predictions"] });
  const { data: myPayout } = useQuery<any>({ queryKey: ["/api/prizes/my-payout"] });

  const predMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/predictions", {
      matchLabel: predictMatch, predictedScore: predictScore,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      setPredictMatch(""); setPredictScore("");
      toast({ title: "ניחוש נשמר!" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  const payMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/prizes/my-payment", { method: payMethod, details: payDetails }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prizes/my-payout"] });
      toast({ title: "פרטי תשלום נשמרו!" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  const predictedCorrect = (predictions as any[]).filter(p => p.isCorrect).length;
  const bonusCash = (predictions as any[]).reduce((s, p) => s + (p.bonusCash || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-display flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: GOLD }} />
          פרסים ותחרויות
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">בריכת הפרסים, ניחושי תוצאות, ותגמולים</p>
      </div>

      {/* Prize Pool Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" style={{ border: "1px solid hsla(43,90%,50%,0.4)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gift className="w-4 h-4" style={{ color: GOLD }} />
              בריכת הפרסים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prizes ? (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg p-3" style={{ background: "hsla(43,90%,50%,0.1)" }}>
                    <p className="text-xs text-muted-foreground">סה"כ נגבה</p>
                    <p className="text-xl font-bold" style={{ color: GOLD }}>
                      {prizes.totalCollected.toLocaleString()}₪
                    </p>
                    <p className="text-xs text-muted-foreground">{prizes.paidParticipants} משתתפים</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: "hsla(155,60%,38%,0.1)" }}>
                    <p className="text-xs text-muted-foreground">סה"כ פרסים</p>
                    <p className="text-xl font-bold text-primary">
                      {prizes.prizeTotal.toLocaleString()}₪
                    </p>
                    <p className="text-xs text-muted-foreground">{prizes.prizePct}% מהקופה</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: "hsla(280,65%,50%,0.1)" }}>
                    <p className="text-xs text-muted-foreground">עמלת פלטפורמה</p>
                    <p className="text-xl font-bold text-purple-400">
                      {prizes.adminCut.toLocaleString()}₪
                    </p>
                    <p className="text-xs text-muted-foreground">{prizes.adminCutPct}%</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">חלוקת הפרסים</p>
                  {prizes.breakdown.map((b: any) => (
                    <div key={b.place} className="space-y-1" data-testid={`prize-place-${b.place}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{b.place === 1 ? "🥇" : b.place === 2 ? "🥈" : b.place === 3 ? "🥉" : "🎖"}</span>
                          <span className="text-sm font-medium">{b.label}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-bold" style={{ color: PLACE_COLORS[b.place as number] || "hsl(155,60%,55%)" }}>
                            {b.amount.toLocaleString("he-IL", { maximumFractionDigits: 0 })}₪
                          </span>
                          <span className="text-xs text-muted-foreground mr-1">({b.pct}%)</span>
                        </div>
                      </div>
                      <PrizeBar pct={b.pct} color={PLACE_COLORS[b.place as number] || "hsl(155,60%,55%)"} />
                    </div>
                  ))}
                </div>

                {prizes.isFinalized && (
                  <Badge className="badge-gold w-full justify-center">✓ העונה הסתיימה — הפרסים חולקו</Badge>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-4">טוען...</div>
            )}
          </CardContent>
        </Card>

        {/* My payout */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" />
              הפרס שלי
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myPayout ? (
              <>
                <div className="text-center py-3 rounded-lg" style={{ background: "hsla(43,90%,50%,0.1)" }}>
                  <p className="text-xs text-muted-foreground">מגיע לך</p>
                  <p className="text-2xl font-bold" style={{ color: GOLD }}>{myPayout.amount.toLocaleString()}₪</p>
                  <p className="text-xs text-muted-foreground">מקום #{myPayout.rank}</p>
                </div>
                <Badge variant={myPayout.status === "paid" ? "default" : "secondary"} className="w-full justify-center">
                  {myPayout.status === "paid" ? "✓ שולם" : myPayout.status === "pending" ? "ממתין לתשלום" : myPayout.status}
                </Badge>
                {myPayout.status === "pending" && !myPayout.paymentDetails && (
                  <div className="space-y-2">
                    <Label className="text-xs">שיטת קבלת הפרס</Label>
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger data-testid="select-pay-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bit">Bit</SelectItem>
                        <SelectItem value="paybox">Paybox</SelectItem>
                        <SelectItem value="bank">העברה בנקאית</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={payDetails} onChange={e => setPayDetails(e.target.value)}
                      placeholder={payMethod === "bank" ? "מספר חשבון + בנק + סניף" : "מספר טלפון"}
                      data-testid="input-pay-details" />
                    <Button className="w-full" size="sm" onClick={() => payMut.mutate()}
                      disabled={!payDetails || payMut.isPending} data-testid="button-submit-payment">
                      {payMut.isPending ? "שומר..." : "שלח פרטי תשלום"}
                    </Button>
                  </div>
                )}
                {myPayout.paymentDetails && myPayout.status !== "paid" && (
                  <p className="text-xs text-muted-foreground text-center">פרטי התשלום נשמרו. המנהל ישלח בקרוב.</p>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-6 text-sm">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>אין פרס מורשם עדיין.</p>
                <p className="text-xs mt-1">הפרסים יחולקו בסיום העונה.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit prediction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              ניחוש תוצאה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg p-3 text-sm space-y-1" style={{ background: "hsla(280,65%,50%,0.1)", border: "1px solid hsla(280,65%,50%,0.2)" }}>
              <p className="font-semibold text-purple-400">מערכת ניקוד ניחושים</p>
              <p className="text-xs text-muted-foreground">✅ תוצאה מדויקת = <strong>10 נקודות</strong></p>
              <p className="text-xs text-muted-foreground">✅ ניצחון נכון = <strong>3 נקודות</strong></p>
              <p className="text-xs text-muted-foreground">🏆 ניחוש מדויק עשוי לזכות בפרס כסף בונוס</p>
            </div>

            <div>
              <Label>משחק (לדוגמה: BRA vs FRA)</Label>
              <Input value={predictMatch} onChange={e => setPredictMatch(e.target.value)}
                placeholder="BRA vs FRA" data-testid="input-predict-match" />
            </div>
            <div>
              <Label>ניחוש תוצאה (לדוגמה: 2-1)</Label>
              <Input value={predictScore} onChange={e => setPredictScore(e.target.value)}
                placeholder="2-1" data-testid="input-predict-score" />
            </div>
            <Button className="w-full" onClick={() => predMut.mutate()}
              disabled={!predictMatch || !predictScore || predMut.isPending || !user?.isPaid}
              data-testid="button-submit-prediction">
              <Plus className="w-4 h-4 ml-2" />
              {predMut.isPending ? "שומר..." : "שמור ניחוש"}
            </Button>
            {!user?.isPaid && <p className="text-xs text-destructive text-center">נדרש תשלום כדי לנחש</p>}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
              <div>
                <p className="text-lg font-bold text-primary">{(predictions as any[]).length}</p>
                <p className="text-xs text-muted-foreground">ניחושים</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: "hsl(155,65%,50%)" }}>{predictedCorrect}</p>
                <p className="text-xs text-muted-foreground">מדויקים</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: GOLD }}>{bonusCash.toFixed(0)}₪</p>
                <p className="text-xs text-muted-foreground">בונוס</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prediction history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">היסטוריית ניחושים</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(predictions as any[]).length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                אין ניחושים עדיין
              </div>
            ) : (
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {(predictions as any[]).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3" data-testid={`row-prediction-${p.id}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.matchLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        ניחוש: <strong>{p.predictedScore}</strong>
                        {p.actualScore && ` · תוצאה: ${p.actualScore}`}
                      </p>
                    </div>
                    <div className="text-left">
                      {p.isCorrect === null || p.isCorrect === undefined ? (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 ml-1" />
                          ממתין
                        </Badge>
                      ) : p.isCorrect ? (
                        <Badge className="text-xs" style={{ background: "hsl(155,60%,38%)" }}>
                          <CheckCircle className="w-3 h-3 ml-1" />
                          נכון +{p.pointsAwarded}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">שגוי</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
