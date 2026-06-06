import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function AuthPage() {
  const { login, register, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      toast({ title: "שגיאה", description: "הסיסמאות אינן תואמות", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await register({ name: regName, email: regEmail, phone: regPhone, password: regPassword });
      toast({ title: "נרשמת בהצלחה!", description: "כעת השלם את התשלום להפעלת החשבון" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(220,20%,6%) 0%, hsl(155,40%,8%) 100%)" }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(155,60%,38%), transparent)" }} />
        <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(43,90%,50%), transparent)" }} />
        {/* Football field lines */}
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50%" cy="50%" r="150" fill="none" stroke="white" strokeWidth="2"/>
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="1"/>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(43,90%,45%))" }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5"/>
              <path d="M12 2C12 2 8 6 8 12C8 18 12 22 12 22" stroke="white" strokeWidth="1.5"/>
              <path d="M12 2C12 2 16 6 16 12C16 18 12 22 12 22" stroke="white" strokeWidth="1.5"/>
              <path d="M2 12H22" stroke="white" strokeWidth="1.5"/>
              <path d="M3.5 7H20.5" stroke="white" strokeWidth="1.2"/>
              <path d="M3.5 17H20.5" stroke="white" strokeWidth="1.2"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">מונדיאל פנטזי 2026</h1>
          <p className="text-muted-foreground text-sm mt-1">בנה את הנבחרת שלך, זכה בגדול</p>
        </div>

        <Card className="bg-card/80 backdrop-blur border-border">
          <CardContent className="pt-6">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">כניסה</TabsTrigger>
                <TabsTrigger value="register">הרשמה</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">אימייל</Label>
                    <Input id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="your@email.com" required data-testid="input-login-email" />
                  </div>
                  <div>
                    <Label htmlFor="login-password">סיסמה</Label>
                    <Input id="login-password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••" required data-testid="input-login-password" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                    {loading ? "מתחבר..." : "כניסה"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="reg-name">שם מלא</Label>
                    <Input id="reg-name" value={regName} onChange={e => setRegName(e.target.value)}
                      placeholder="ישראל ישראלי" required data-testid="input-reg-name" />
                  </div>
                  <div>
                    <Label htmlFor="reg-email">אימייל</Label>
                    <Input id="reg-email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                      placeholder="your@email.com" required data-testid="input-reg-email" />
                  </div>
                  <div>
                    <Label htmlFor="reg-phone">מספר טלפון</Label>
                    <Input id="reg-phone" type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                      placeholder="050-0000000" required data-testid="input-reg-phone" />
                  </div>
                  <div>
                    <Label htmlFor="reg-password">סיסמה</Label>
                    <Input id="reg-password" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                      placeholder="••••••••" required data-testid="input-reg-password" />
                  </div>
                  <div>
                    <Label htmlFor="reg-confirm">אימות סיסמה</Label>
                    <Input id="reg-confirm" type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)}
                      placeholder="••••••••" required data-testid="input-reg-confirm" />
                  </div>

                  <div className="rounded-lg p-3 text-sm" style={{ background: "hsla(43,90%,50%,0.1)", border: "1px solid hsla(43,90%,50%,0.3)" }}>
                    <p className="font-semibold" style={{ color: "hsl(var(--gold))" }}>דמי השתתפות: 300₪</p>
                    <p className="text-muted-foreground text-xs mt-1">לעונת המונדיאל 2026 המלאה. לאחר ההרשמה תועבר לדף תשלום מאובטח.</p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading} data-testid="button-register">
                    {loading ? "נרשם..." : "הרשמה ומעבר לתשלום"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          מערכת מאובטחת · תשלום דרך PayPlus · חשבונית מיידית
        </p>
      </div>
    </div>
  );
}
