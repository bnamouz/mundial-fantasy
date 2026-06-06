import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star } from "lucide-react";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { data: leaderboard = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/leaderboard"] });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold font-display flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: "hsl(var(--gold))" }} />
          טבלת הדירוג
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">דירוג כל המשתתפים לפי נקודות</p>
      </div>

      {/* Top 3 podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry: any, i) => {
            if (!entry) return null;
            const isFirst = entry.rank === 1;
            return (
              <Card key={entry.userId} className={isFirst ? "ring-2" : ""} style={isFirst ? { ringColor: "hsl(var(--gold))" } : {}}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl mb-1">{RANK_MEDALS[entry.rank - 1] || `#${entry.rank}`}</p>
                  <p className="text-sm font-semibold truncate">{entry.userName}</p>
                  <p className="text-xs text-muted-foreground">#{entry.rank}</p>
                  <p className="text-lg font-bold mt-1 text-primary">{entry.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">נקודות</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">דירוג מלא</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">טוען...</div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>עדיין אין תוצאות. הדירוג יעודכן לאחר סיום המשחקים.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {leaderboard.map((entry: any) => {
                const isMe = entry.userId === user?.id;
                return (
                  <div key={entry.userId}
                    className={`flex items-center gap-4 px-4 py-3 ${isMe ? "bg-primary/5" : ""}`}
                    data-testid={`row-leaderboard-${entry.userId}`}>
                    <div className="w-8 text-center">
                      {entry.rank <= 3 ? (
                        <span className="text-lg">{RANK_MEDALS[entry.rank - 1]}</span>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {entry.userName}
                        {isMe && <span className="mr-2 text-xs text-primary">(אתה)</span>}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-primary">{entry.totalPoints}</p>
                      <p className="text-xs text-muted-foreground">כולל</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: "hsl(var(--gold))" }}>{entry.weeklyPoints}</p>
                      <p className="text-xs text-muted-foreground">השבוע</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
