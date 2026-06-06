import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Instagram, Sparkles, Clock, CheckCircle, PlusCircle, Copy, Share2 } from "lucide-react";

const POST_TYPE_LABELS: Record<string, string> = {
  promo: "פרסומת", player_update: "עדכון שחקן", weekly_top: "שבועי", invite: "הזמנה",
};

const STATUS_STYLES: Record<string, any> = {
  draft: { color: "text-muted-foreground", label: "טיוטה", icon: Clock },
  scheduled: { color: "text-yellow-400", label: "מתוזמן", icon: Clock },
  posted: { color: "text-green-400", label: "פורסם", icon: CheckCircle },
};

export default function InstagramPage() {
  const { toast } = useToast();
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("promo");

  const { data: posts = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/instagram/posts"] });

  const generateMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/instagram/generate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instagram/posts"] });
      toast({ title: "פוסטים נוצרו!", description: "3 פוסטים חדשים נוצרו אוטומטית" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/instagram/posts", { type: newType, content: newContent, status: "draft" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instagram/posts"] });
      setNewContent("");
      toast({ title: "פוסט נשמר" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/instagram/posts/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/instagram/posts"] }),
  });

  const copyPost = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "הועתק ללוח" });
  };

  const stats = {
    total: (posts as any[]).length,
    scheduled: (posts as any[]).filter(p => p.status === "scheduled").length,
    posted: (posts as any[]).filter(p => p.status === "posted").length,
    draft: (posts as any[]).filter(p => p.status === "draft").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-display flex items-center gap-2">
            <Instagram className="w-5 h-5" style={{ color: "#E1306C" }} />
            מערכת פרסום אינסטגרם
          </h1>
          <p className="text-sm text-muted-foreground">ניהול וייצור תוכן שיווקי למונדיאל פנטזי</p>
        </div>
        <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}
          style={{ background: "linear-gradient(135deg, #E1306C, #833AB4)" }}
          data-testid="button-generate-posts">
          <Sparkles className="w-4 h-4 ml-2" />
          {generateMut.isPending ? "יוצר..." : "צור פוסטים אוטומטי"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "סה״כ", value: stats.total, color: "text-foreground" },
          { label: "טיוטות", value: stats.draft, color: "text-muted-foreground" },
          { label: "מתוזמן", value: stats.scheduled, color: "text-yellow-400" },
          { label: "פורסם", value: stats.posted, color: "text-green-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create new post */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" />
              פוסט חדש
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>סוג פוסט</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger data-testid="select-post-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promo">פרסומת</SelectItem>
                  <SelectItem value="player_update">עדכון שחקן</SelectItem>
                  <SelectItem value="weekly_top">דירוג שבועי</SelectItem>
                  <SelectItem value="invite">הזמנת חברים</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תוכן</Label>
              <Textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="כתוב את הפוסט כאן... שלב האשטאגים, אמוג'י ולינק" className="min-h-32" data-testid="textarea-post-content" />
            </div>
            <Button className="w-full" onClick={() => createMut.mutate()} disabled={!newContent || createMut.isPending} data-testid="button-save-post">
              {createMut.isPending ? "שומר..." : "שמור פוסט"}
            </Button>

            {/* Tips */}
            <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "hsla(280,65%,50%,0.1)", border: "1px solid hsla(280,65%,50%,0.2)" }}>
              <p className="font-semibold text-purple-400">טיפים לפוסט מוצלח:</p>
              <p className="text-muted-foreground">• השתמש ב-5-10 האשטאגים</p>
              <p className="text-muted-foreground">• הוסף אמוג'י בתחילת כל שורה</p>
              <p className="text-muted-foreground">• CTA ברור: "הצטרף עכשיו"</p>
              <p className="text-muted-foreground">• זמן פרסום מומלץ: 18:00-21:00</p>
            </div>
          </CardContent>
        </Card>

        {/* Posts list */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading && <div className="text-muted-foreground p-4">טוען...</div>}
          {(posts as any[]).length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <Instagram className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">אין פוסטים עדיין. לחץ על "צור פוסטים אוטומטי" להתחלה</p>
              </CardContent>
            </Card>
          )}
          {(posts as any[]).map((post: any) => {
            const s = STATUS_STYLES[post.status] || STATUS_STYLES.draft;
            return (
              <Card key={post.id} data-testid={`card-post-${post.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{POST_TYPE_LABELS[post.type] || post.type}</Badge>
                      <div className={`flex items-center gap-1 text-xs ${s.color}`}>
                        <s.icon className="w-3 h-3" />
                        {s.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => copyPost(post.content)} data-testid={`button-copy-${post.id}`}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      {post.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: post.id, status: "scheduled" })}
                          data-testid={`button-schedule-${post.id}`}>
                          תזמן
                        </Button>
                      )}
                      {post.status === "scheduled" && (
                        <Button size="sm" onClick={() => statusMut.mutate({ id: post.id, status: "posted" })}
                          data-testid={`button-mark-posted-${post.id}`}
                          style={{ background: "linear-gradient(135deg, #E1306C, #833AB4)" }}>
                          <Share2 className="w-3 h-3 ml-1" />
                          פורסם
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{post.content}</p>
                  {post.imagePrompt && (
                    <div className="rounded p-2 text-xs" style={{ background: "hsla(155,60%,38%,0.1)", color: "hsl(155,60%,55%)" }}>
                      🎨 הנחיית תמונה: {post.imagePrompt}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Instagram Tips section */}
      <Card style={{ border: "1px solid hsla(280,65%,50%,0.3)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            אסטרטגיית פרסום מומלצת
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">לפני המונדיאל</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li>• פרסום יומי: 1-2 פוסטים</li>
                <li>• רילס: כרזות הצטרפות</li>
                <li>• Stories: ספירה לאחור</li>
                <li>• מטרה: 500+ עוקבים</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">במהלך המונדיאל</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li>• עדכוני שחקנים אחרי כל משחק</li>
                <li>• דירוג שבועי כל יום שישי</li>
                <li>• Stories: תוצאות חיות</li>
                <li>• תחרויות ניחוש</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">האשטאגים מומלצים</p>
              <div className="flex flex-wrap gap-1">
                {["#מונדיאל2026", "#WorldCup2026", "#פנטזיפוטבול", "#Fantasy", "#Football", "#FIFA", "#כדורגל", "#ישראל"].map(tag => (
                  <button key={tag} className="text-xs rounded px-1.5 py-0.5 cursor-pointer"
                    style={{ background: "hsla(155,60%,38%,0.15)", color: "hsl(155,60%,55%)" }}
                    onClick={() => navigator.clipboard.writeText(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
