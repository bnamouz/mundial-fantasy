import { type Express } from "express";
import { Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { insertUserSchema, insertPlayerSchema, insertFantasyTeamSchema, insertMatchdayPointsSchema, insertInstagramPostSchema, insertPredictionSchema } from "@shared/schema";

// Scoring system constants
const SCORING = {
  GOAL_GK: 10, GOAL_DEF: 8, GOAL_MID: 6, GOAL_FWD: 5,
  ASSIST: 3,
  CLEAN_SHEET_GK: 6, CLEAN_SHEET_DEF: 4, CLEAN_SHEET_MID: 1,
  YELLOW_CARD: -1, RED_CARD: -3,
  SAVE_3: 1, // per 3 saves
  PLAYED_60: 1, PLAYED_90: 2, // minutes played bonus
};

function calcPlayerPoints(stats: {
  goals: number; assists: number; yellowCards: number; redCards: number;
  cleanSheet: boolean; minutesPlayed: number; saves: number; position: string;
}): number {
  let pts = 0;
  const pos = stats.position;
  if (pos === "GK") pts += stats.goals * SCORING.GOAL_GK;
  else if (pos === "DEF") pts += stats.goals * SCORING.GOAL_DEF;
  else if (pos === "MID") pts += stats.goals * SCORING.GOAL_MID;
  else pts += stats.goals * SCORING.GOAL_FWD;
  pts += stats.assists * SCORING.ASSIST;
  if (stats.cleanSheet) {
    if (pos === "GK") pts += SCORING.CLEAN_SHEET_GK;
    else if (pos === "DEF") pts += SCORING.CLEAN_SHEET_DEF;
    else if (pos === "MID") pts += SCORING.CLEAN_SHEET_MID;
  }
  pts += stats.yellowCards * SCORING.YELLOW_CARD;
  pts += stats.redCards * SCORING.RED_CARD;
  pts += Math.floor(stats.saves / 3) * SCORING.SAVE_3;
  if (stats.minutesPlayed >= 90) pts += SCORING.PLAYED_90;
  else if (stats.minutesPlayed >= 60) pts += SCORING.PLAYED_60;
  return pts;
}

// Generate invoice number
function generateInvoice(): string {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Simple JWT-like token (base64 encoded, not cryptographically secure for demo)
function generateToken(userId: number): string {
  return Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64");
}
function verifyToken(token: string): number | null {
  try {
    const { userId } = JSON.parse(Buffer.from(token, "base64").toString());
    return userId;
  } catch { return null; }
}

// Auth middleware
function auth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const userId = verifyToken(token);
  if (!userId) return res.status(401).json({ error: "Invalid token" });
  const user = storage.getUser(userId);
  if (!user) return res.status(401).json({ error: "User not found" });
  req.user = user;
  next();
}

function adminAuth(req: any, res: any, next: any) {
  auth(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Admin only" });
    next();
  });
}

export function registerRoutes(httpServer: Server, app: Express) {
  // ── Auth ──────────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const existing = storage.getUserByEmail(parsed.data.email);
    if (existing) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(parsed.data.passwordHash, 10);
    const user = storage.createUser({ ...parsed.data, passwordHash });
    const token = generateToken(user.id);
    res.json({ user: { ...user, passwordHash: undefined }, token });
  });

  // Admin: create first admin user (one-time setup)
  app.post("/api/auth/setup-admin", async (req, res) => {
    const allUsers = storage.getAllUsers();
    if (allUsers.some(u => u.isAdmin)) return res.status(403).json({ error: "Admin already exists" });
    const { email, password, name, phone } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = storage.createUser({ name, email, phone, passwordHash, isPaid: true });
    // Set admin flag directly
    storage.setAdmin(user.id);
    const token = generateToken(user.id);
    res.json({ message: "Admin created successfully", userId: user.id, token });
  });

  // Promote user to admin by secret key
  app.post("/api/auth/make-admin", async (req, res) => {
    const { userId, secret } = req.body;
    if (secret !== "MUNDIAL2026ADMIN") return res.status(403).json({ error: "Wrong secret" });
    storage.setAdmin(userId || 1);
    const user = storage.getUserById(userId || 1);
    const token = generateToken(userId || 1);
    res.json({ success: true, user: { ...user, passwordHash: undefined }, token });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });
    const user = storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = generateToken(user.id);
    res.json({ user: { ...user, passwordHash: undefined }, token });
  });

  app.get("/api/auth/me", auth, (req: any, res) => {
    const { passwordHash, ...user } = req.user;
    res.json(user);
  });

  // ── Payment (simulated PayPlus flow) ─────────────────────────────────────

  app.post("/api/payment/checkout", auth, async (req: any, res) => {
    const user = req.user;
    if (user.isPaid) return res.status(400).json({ error: "Already paid" });

    const PAYPLUS_API_KEY = process.env.PAYPLUS_API_KEY;
    const PAYPLUS_SECRET = process.env.PAYPLUS_SECRET;
    const APP_URL = process.env.APP_URL || 'https://mundial-fantasy26-production.up.railway.app';

    // If PayPlus keys exist — use real API
    if (PAYPLUS_API_KEY && PAYPLUS_SECRET) {
      try {
        const response = await fetch('https://restapi.payplus.co.il/api/v1.0/PaymentPages/generateLink', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': JSON.stringify({ api_key: PAYPLUS_API_KEY, secret_key: PAYPLUS_SECRET }),
          },
          body: JSON.stringify({
            payment_page_uid: process.env.PAYPLUS_PAGE_UID || '',
            charge_default: { currency_code: 'ILS', amount: 300 },
            more_info: String(user.id),
            more_info_1: `Mundial Fantasy 2026 - ${user.name}`,
            success_redirect_url: `${APP_URL}/#/?payment=success`,
            fail_redirect_url: `${APP_URL}/#/?payment=fail`,
            sendEmailApproval: true,
            sendEmailFailure: true,
          }),
        });
        const data = await response.json();
        if (data?.results?.status === 'success' && data?.data?.payment_page_link) {
          return res.json({ paymentUrl: data.data.payment_page_link, amount: 300, currency: 'ILS', real: true });
        }
        console.error('PayPlus error:', data);
      } catch (e) {
        console.error('PayPlus fetch error:', e);
      }
    }

    // Fallback: demo link
    const paymentUrl = `https://payplus.co.il/checkout/mundial-fantasy?uid=${user.id}&amount=300&ref=${Date.now()}`;
    res.json({ paymentUrl, amount: 300, currency: 'ILS', real: false });
  });

  app.post("/api/payment/confirm", auth, (req: any, res) => {
    // In production: verify webhook from PayPlus
    const { paymentRef } = req.body;
    if (!paymentRef) return res.status(400).json({ error: "Missing payment reference" });
    const invoiceNumber = generateInvoice();
    const user = storage.updateUserPayment(req.user.id, paymentRef, invoiceNumber);
    // Add to prize pool (80% of 300₪)
    storage.addToPrizePool(300);
    res.json({ success: true, invoiceNumber, user: { ...user, passwordHash: undefined } });
  });

  // PayPlus webhook (production)
  app.post("/api/webhooks/payplus", (req, res) => {
    const { more_info, payment_request_uid, status } = req.body;
    if (status === "COMPLETED" && more_info) {
      const userId = parseInt(more_info);
      const user = storage.getUser(userId);
      if (user && !user.isPaid) {
        const invoiceNumber = generateInvoice();
        storage.updateUserPayment(userId, payment_request_uid, invoiceNumber);
        storage.addToPrizePool(300);
      }
    }
    res.json({ ok: true });
  });

  // ── Players ───────────────────────────────────────────────────────────────

  app.get("/api/players", (req, res) => {
    const players = storage.getAllPlayers();
    res.json(players);
  });

  app.get("/api/players/:id", (req, res) => {
    const player = storage.getPlayer(parseInt(req.params.id));
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(player);
  });

  app.post("/api/players", adminAuth, (req: any, res) => {
    const parsed = insertPlayerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const player = storage.createPlayer(parsed.data);
    res.json(player);
  });

  app.patch("/api/players/:id", adminAuth, (req: any, res) => {
    const id = parseInt(req.params.id);
    storage.updatePlayerStats(id, req.body);
    res.json({ success: true });
  });

  // ── Fantasy Team ──────────────────────────────────────────────────────────

  app.get("/api/team", auth, (req: any, res) => {
    const team = storage.getTeamByUser(req.user.id);
    if (!team) return res.json(null);
    const teamPlayers = storage.getTeamPlayers(team.id);
    res.json({ team, players: teamPlayers });
  });

  app.post("/api/team", auth, (req: any, res) => {
    if (!req.user.isPaid) return res.status(403).json({ error: "Payment required to create team" });
    const existing = storage.getTeamByUser(req.user.id);
    if (existing) return res.status(409).json({ error: "Team already exists" });
    const { teamName, formation, coachName } = req.body;
    const team = storage.createTeam({
      userId: req.user.id, teamName: teamName || "My Team",
      formation: formation || "4-3-3", coachName
    });
    res.json(team);
  });

  app.patch("/api/team", auth, (req: any, res) => {
    const team = storage.getTeamByUser(req.user.id);
    if (!team) return res.status(404).json({ error: "Team not found" });
    storage.updateTeam(team.id, req.body);
    res.json({ success: true });
  });

  // ── Buy / Sell Players ────────────────────────────────────────────────────

  app.post("/api/team/buy", auth, (req: any, res) => {
    if (!req.user.isPaid) return res.status(403).json({ error: "Payment required" });
    const { playerId, slot, isBench } = req.body;
    const player = storage.getPlayer(parseInt(playerId));
    if (!player) return res.status(404).json({ error: "Player not found" });

    const user = req.user;
    if (user.budget < player.price) return res.status(400).json({ error: "Insufficient budget" });

    let team = storage.getTeamByUser(user.id);
    if (!team) {
      team = storage.createTeam({ userId: user.id, teamName: "My Team", formation: "4-3-3" });
    }

    const currentPlayers = storage.getTeamPlayers(team.id);
    if (currentPlayers.length >= 16) return res.status(400).json({ error: "Team is full (max 16 players)" });

    storage.addPlayerToTeam({
      teamId: team.id, playerId: parseInt(playerId),
      slot: slot || (currentPlayers.length + 1),
      isBench: isBench || false,
      purchasePrice: player.price,
    });
    storage.createTransaction({ userId: user.id, playerId: parseInt(playerId), type: "buy", price: player.price });
    storage.updateUserBudget(user.id, user.budget - player.price);

    res.json({ success: true, newBudget: user.budget - player.price });
  });

  app.post("/api/team/sell", auth, (req: any, res) => {
    const { playerId } = req.body;
    const player = storage.getPlayer(parseInt(playerId));
    if (!player) return res.status(404).json({ error: "Player not found" });

    const team = storage.getTeamByUser(req.user.id);
    if (!team) return res.status(404).json({ error: "No team found" });

    storage.removePlayerFromTeam(team.id, parseInt(playerId));
    storage.createTransaction({ userId: req.user.id, playerId: parseInt(playerId), type: "sell", price: player.price });
    storage.updateUserBudget(req.user.id, req.user.budget + player.price);

    res.json({ success: true, newBudget: req.user.budget + player.price });
  });

  // ── Leaderboard ───────────────────────────────────────────────────────────

  app.get("/api/leaderboard", (req, res) => {
    const lb = storage.getLeaderboard();
    res.json(lb.map(r => ({
      rank: r.rank,
      totalPoints: r.totalPoints,
      weeklyPoints: r.weeklyPoints,
      userName: r.user.name,
      userId: r.user.id,
    })));
  });

  // ── Matchday (Admin: add results) ─────────────────────────────────────────

  app.post("/api/matchday", adminAuth, (req: any, res) => {
    const parsed = insertMatchdayPointsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const player = storage.getPlayer(parsed.data.playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });

    const pts = calcPlayerPoints({
      goals: parsed.data.goals, assists: parsed.data.assists,
      yellowCards: parsed.data.yellowCards, redCards: parsed.data.redCards,
      cleanSheet: parsed.data.cleanSheet, minutesPlayed: parsed.data.minutesPlayed,
      saves: parsed.data.saves, position: player.position,
    });

    const entry = storage.addMatchdayPoints({ ...parsed.data, points: pts });

    // Update player total points and stats
    storage.updatePlayerStats(player.id, {
      totalPoints: player.totalPoints + pts,
      goals: player.goals + parsed.data.goals,
      assists: player.assists + parsed.data.assists,
      yellowCards: player.yellowCards + parsed.data.yellowCards,
      redCards: player.redCards + parsed.data.redCards,
      cleanSheets: player.cleanSheets + (parsed.data.cleanSheet ? 1 : 0),
      minutesPlayed: player.minutesPlayed + parsed.data.minutesPlayed,
      saves: player.saves + parsed.data.saves,
      trend: pts > 5 ? "up" : pts < 0 ? "down" : "stable",
      price: Math.max(1, player.price + (pts > 5 ? 1 : pts < 0 ? -0.5 : 0)),
      priceChange: pts > 5 ? 1 : pts < 0 ? -0.5 : 0,
    });

    res.json({ entry, pointsScored: pts });
  });

  // ── Admin: seed players ───────────────────────────────────────────────────

  // Full seed — all 48 teams from seed_data.json
  app.post("/api/admin/seed-players", adminAuth, (req: any, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const seedPath = path.join(process.cwd(), 'seed_data.json');
      if (!fs.existsSync(seedPath)) {
        return res.status(404).json({ error: 'seed_data.json not found. Run build first.' });
      }
      const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

      // Clear existing
      storage.clearPlayers();
      storage.clearCoaches();

      // Insert players
      let playerCount = 0;
      for (const p of data.players) {
        storage.createPlayer(p as any);
        playerCount++;
      }

      // Insert coaches
      let coachCount = 0;
      for (const c of data.coaches) {
        storage.createCoach({ name: c.coachName, country: c.country, countryCode: c.countryCode, group: c.group } as any);
        coachCount++;
      }

      return res.json({ success: true, players: playerCount, coaches: coachCount, teams: data.teams?.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Legacy small seed (fallback)
  app.post("/api/admin/seed-players-legacy", adminAuth, (req: any, res) => {
    const seedPlayers = [
      // Brazil
      { name: "Vinicius Jr.", nameAr: "فينيسيوس جونيور", nameHe: "ויניסיוס", country: "Brazil", countryCode: "BRA", position: "FWD", price: 15, trend: "up" },
      { name: "Rodrygo", nameAr: "رودريغو", nameHe: "רודריגו", country: "Brazil", countryCode: "BRA", position: "FWD", price: 12, trend: "stable" },
      { name: "Alisson", nameAr: "أليسون", nameHe: "אליסון", country: "Brazil", countryCode: "BRA", position: "GK", price: 10, trend: "stable" },
      // France
      { name: "Kylian Mbappé", nameAr: "كيليان مبابي", nameHe: "מבאפה", country: "France", countryCode: "FRA", position: "FWD", price: 18, trend: "up" },
      { name: "Antoine Griezmann", nameAr: "أنطوان غريزمان", nameHe: "גריזמן", country: "France", countryCode: "FRA", position: "MID", price: 13, trend: "stable" },
      // England
      { name: "Harry Kane", nameAr: "هاري كين", nameHe: "קיין", country: "England", countryCode: "ENG", position: "FWD", price: 16, trend: "up" },
      { name: "Jude Bellingham", nameAr: "جود بيلينغهام", nameHe: "בלינגהם", country: "England", countryCode: "ENG", position: "MID", price: 17, trend: "up" },
      // Argentina
      { name: "Lionel Messi", nameAr: "ليونيل ميسي", nameHe: "מסי", country: "Argentina", countryCode: "ARG", position: "FWD", price: 20, trend: "up" },
      { name: "Julián Álvarez", nameAr: "خوليان ألفاريز", nameHe: "אלוורז", country: "Argentina", countryCode: "ARG", position: "FWD", price: 13, trend: "up" },
      // Portugal
      { name: "Cristiano Ronaldo", nameAr: "كريستيانو رونالدو", nameHe: "רונאלדו", country: "Portugal", countryCode: "POR", position: "FWD", price: 18, trend: "stable" },
      { name: "Bruno Fernandes", nameAr: "برونو فيرنانديز", nameHe: "פרנאנדס", country: "Portugal", countryCode: "POR", position: "MID", price: 14, trend: "up" },
      // Spain
      { name: "Pedri", nameAr: "بيدري", nameHe: "פדרי", country: "Spain", countryCode: "ESP", position: "MID", price: 13, trend: "up" },
      { name: "Álvaro Morata", nameAr: "ألفارو موراتا", nameHe: "מוראטה", country: "Spain", countryCode: "ESP", position: "FWD", price: 11, trend: "stable" },
      // Germany
      { name: "Florian Wirtz", nameAr: "فلوريان فيرتز", nameHe: "וירץ", country: "Germany", countryCode: "GER", position: "MID", price: 14, trend: "up" },
      { name: "Kai Havertz", nameAr: "كاي هافيرتز", nameHe: "הוורץ", country: "Germany", countryCode: "GER", position: "MID", price: 12, trend: "stable" },
      // Netherlands
      { name: "Virgil van Dijk", nameAr: "فيرجيل فان دايك", nameHe: "ואן דייק", country: "Netherlands", countryCode: "NED", position: "DEF", price: 12, trend: "stable" },
      // Morocco
      { name: "Achraf Hakimi", nameAr: "أشرف حكيمي", nameHe: "חקימי", country: "Morocco", countryCode: "MAR", position: "DEF", price: 11, trend: "up" },
      // More players
      { name: "Erling Haaland", nameAr: "إيرلينغ هالاند", nameHe: "הולאנד", country: "Norway", countryCode: "NOR", position: "FWD", price: 19, trend: "up" },
      { name: "Lamine Yamal", nameAr: "لامين يامال", nameHe: "יאמאל", country: "Spain", countryCode: "ESP", position: "FWD", price: 16, trend: "up" },
      { name: "Bukayo Saka", nameAr: "بوكايو ساكا", nameHe: "סאקה", country: "England", countryCode: "ENG", position: "MID", price: 14, trend: "up" },
      { name: "Phil Foden", nameAr: "فيل فودن", nameHe: "פודן", country: "England", countryCode: "ENG", position: "MID", price: 15, trend: "stable" },
      { name: "Trent Alexander-Arnold", nameAr: "ترنت", nameHe: "אלכסנדר ארנולד", country: "England", countryCode: "ENG", position: "DEF", price: 12, trend: "up" },
      { name: "Rúben Dias", nameAr: "روبن دياز", nameHe: "דיאס", country: "Portugal", countryCode: "POR", position: "DEF", price: 11, trend: "stable" },
      { name: "Diogo Costa", nameAr: "دييغو كوستا", nameHe: "קוסטה", country: "Portugal", countryCode: "POR", position: "GK", price: 9, trend: "stable" },
      { name: "Ederson", nameAr: "إيدرسون", nameHe: "אדרסון", country: "Brazil", countryCode: "BRA", position: "GK", price: 9, trend: "stable" },
      { name: "Manuel Neuer", nameAr: "مانويل نوير", nameHe: "נוייר", country: "Germany", countryCode: "GER", position: "GK", price: 10, trend: "stable" },
      { name: "Antoine Rudiger", nameAr: "رودجر", nameHe: "רידיגר", country: "Germany", countryCode: "GER", position: "DEF", price: 10, trend: "stable" },
      { name: "Marquinhos", nameAr: "ماركينيوس", nameHe: "מרקיניוס", country: "Brazil", countryCode: "BRA", position: "DEF", price: 11, trend: "stable" },
      { name: "Enzo Fernández", nameAr: "إنزو فيرنانديز", nameHe: "פרנאנדז", country: "Argentina", countryCode: "ARG", position: "MID", price: 13, trend: "stable" },
      { name: "Nicolás Tagliafico", nameAr: "تاغلياfico", nameHe: "טגליאפיקו", country: "Argentina", countryCode: "ARG", position: "DEF", price: 10, trend: "stable" },
    ];

    const created = seedPlayers.map(p => storage.createPlayer(p as any));
    res.json({ created: created.length, players: created });
  });

  // ── Instagram Posts ───────────────────────────────────────────────────────

  app.get("/api/instagram/posts", auth, (req: any, res) => {
    const posts = storage.getAllPosts();
    res.json(posts);
  });

  app.post("/api/instagram/posts", auth, (req: any, res) => {
    const parsed = insertInstagramPostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const post = storage.createPost(parsed.data);
    res.json(post);
  });

  app.patch("/api/instagram/posts/:id", auth, (req: any, res) => {
    storage.updatePostStatus(parseInt(req.params.id), req.body.status);
    res.json({ success: true });
  });

  // Generate promo posts automatically
  app.post("/api/instagram/generate", auth, (req: any, res) => {
    const players = storage.getAllPlayers();
    const topPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5);

    const posts = [
      {
        type: "promo",
        content: `🏆 מונדיאל פנטזי 2026 - הצטרף עכשיו!\n\n⚽ בנה את הנבחרת שלך מכל שחקני המונדיאל\n💰 דמי השתתפות: 300₪ לעונה\n🥇 המנצח יזכה בפרסים בלעדיים!\n\nהרשמה עכשיו בלינק בביו 👆\n\n#מונדיאל2026 #פנטזיפוטבול #WorldCup2026 #Fantasy`,
        imagePrompt: "World Cup 2026 fantasy football promotional poster, vibrant green football field, trophy, global flags, modern design",
        status: "draft",
      },
      {
        type: "player_update",
        content: `📊 עדכון שחקנים - שבוע 1\n\n🔥 השחקנים החמים:\n${topPlayers.slice(0, 3).map((p, i) => `${i + 1}. ${p.name} 🇺🇳 ${p.totalPoints} נקודות`).join("\n")}\n\n📈 מי קנה אותם כבר?\n\n#מונדיאל2026 #פנטזי #כדורגל`,
        imagePrompt: "Football player stats infographic, World Cup 2026, dark background, glowing stats numbers, modern sports design",
        status: "draft",
      },
      {
        type: "invite",
        content: `👥 הזמן חברים - קבל יתרון!\n\n🎯 הצטרף עם חברים לליגת מונדיאל פנטזי\n💵 300₪ לכל העונה\n🏅 תחרו ביניכם על תואר המנהל הטוב ביותר!\n\nהרשמה: לחץ על הלינק בביו\n\n#Friends #Football #WorldCup2026 #Fantasy #כדורגל`,
        imagePrompt: "Friends watching football together, World Cup atmosphere, excited fans, celebration, colorful and energetic",
        status: "draft",
      },
    ];

    const created = posts.map(p => storage.createPost(p as any));
    res.json(created);
  });

  // ── Prize Pool & Payouts ─────────────────────────────────────────────────

  app.get("/api/prizes", (req, res) => {
    const pool = storage.getPrizePool();
    const allUsers = storage.getAllUsers();
    const paidCount = allUsers.filter(u => u.isPaid).length;
    const total = pool?.totalCollected ?? paidCount * 300;
    const adminCutPct = pool?.adminCutPct ?? 40;
    const prizePct = pool?.prizePct ?? 60;
    const prizeTotal = total * (prizePct / 100);
    const adminTotal = total * (adminCutPct / 100);

    res.json({
      totalCollected: total,
      adminCut: adminTotal,
      adminCutPct,
      prizeTotal,
      prizePct,
      breakdown: [
        { place: 1, label: 'ראשון', pct: pool?.firstPlacePct ?? 50, amount: prizeTotal * ((pool?.firstPlacePct ?? 50) / 100) },
        { place: 2, label: 'שני', pct: pool?.secondPlacePct ?? 25, amount: prizeTotal * ((pool?.secondPlacePct ?? 25) / 100) },
        { place: 3, label: 'שלישי', pct: pool?.thirdPlacePct ?? 15, amount: prizeTotal * ((pool?.thirdPlacePct ?? 15) / 100) },
        { place: '4-10', label: 'ניחום', pct: pool?.consolationPct ?? 10, amount: prizeTotal * ((pool?.consolationPct ?? 10) / 100) },
      ],
      paidParticipants: paidCount,
      isFinalized: pool?.isFinalized ?? false,
    });
  });

  app.patch("/api/prizes/config", adminAuth, (req: any, res) => {
    const pool = storage.upsertPrizePool(req.body);
    res.json(pool);
  });

  // Finalize season and calculate payouts
  app.post("/api/prizes/finalize", adminAuth, (req: any, res) => {
    const pool = storage.getPrizePool();
    const lb = storage.getLeaderboard();
    const allUsers = storage.getAllUsers();
    const paidCount = allUsers.filter(u => u.isPaid).length;
    const total = (pool?.totalCollected ?? paidCount * 300);
    const prizePct = pool?.prizePct ?? 60;
    const prizeTotal = total * (prizePct / 100);
    const f1 = (pool?.firstPlacePct ?? 50) / 100;
    const f2 = (pool?.secondPlacePct ?? 25) / 100;
    const f3 = (pool?.thirdPlacePct ?? 15) / 100;
    const fCon = (pool?.consolationPct ?? 10) / 100;
    const consolationCount = Math.max(1, Math.floor(lb.length * 0.1));
    const perConsolation = lb.length > 3 ? (prizeTotal * fCon) / consolationCount : 0;

    const payoutsList: any[] = [];
    lb.forEach(entry => {
      let amount = 0;
      if (entry.rank === 1) amount = prizeTotal * f1;
      else if (entry.rank === 2) amount = prizeTotal * f2;
      else if (entry.rank === 3) amount = prizeTotal * f3;
      else if (entry.rank <= consolationCount + 3) amount = perConsolation;

      if (amount > 0) {
        const existing = storage.getPayout(entry.userId);
        if (!existing) {
          storage.createPayout({ userId: entry.userId, rank: entry.rank, amount, status: 'pending' });
          payoutsList.push({ userId: entry.userId, rank: entry.rank, amount });
        }
      }
    });

    storage.upsertPrizePool({ isFinalized: true });
    res.json({ success: true, payouts: payoutsList, prizeTotal });
  });

  app.get("/api/prizes/payouts", adminAuth, (req: any, res) => {
    const p = storage.getAllPayouts();
    res.json(p.map(r => ({ ...r, user: { name: r.user.name, email: r.user.email, phone: r.user.phone } })));
  });

  app.patch("/api/prizes/payouts/:id", adminAuth, (req: any, res) => {
    const { status, paidAt, paymentMethod, paymentDetails } = req.body;
    if (paymentMethod) storage.updatePayoutDetails(parseInt(req.params.id), paymentMethod, paymentDetails);
    if (status) storage.updatePayoutStatus(parseInt(req.params.id), status, paidAt || new Date().toISOString());
    res.json({ success: true });
  });

  // User: submit payment details for receiving prize
  app.post("/api/prizes/my-payment", auth, (req: any, res) => {
    const payout = storage.getPayout(req.user.id);
    if (!payout) return res.status(404).json({ error: 'אין פרס מורשם לחשבונך' });
    storage.updatePayoutDetails(payout.id, req.body.method, req.body.details);
    res.json({ success: true });
  });

  app.get("/api/prizes/my-payout", auth, (req: any, res) => {
    const payout = storage.getPayout(req.user.id);
    res.json(payout || null);
  });

  // ── Predictions ───────────────────────────────────────────────────────────

  app.get("/api/predictions", auth, (req: any, res) => {
    const preds = storage.getUserPredictions(req.user.id);
    res.json(preds);
  });

  app.post("/api/predictions", auth, (req: any, res) => {
    if (!req.user.isPaid) return res.status(403).json({ error: 'תשלום נדרש' });
    const parsed = insertPredictionSchema.safeParse({ ...req.body, userId: req.user.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const pred = storage.createPrediction(parsed.data);
    res.json(pred);
  });

  // Admin: resolve prediction results
  app.post("/api/predictions/resolve", adminAuth, (req: any, res) => {
    const { matchLabel, actualScore } = req.body;
    const preds = storage.getPredictionsByMatch(matchLabel);
    let correct = 0;
    preds.forEach(p => {
      const isCorrect = p.predictedScore === actualScore;
      const pts = isCorrect ? 10 : (actualScore.split('-')[0] === p.predictedScore.split('-')[0] ? 3 : 0); // exact=10, correct winner=3
      const cash = 0; // cash bonus for exact score from pool (admin can add manually)
      storage.resolvePrediction(p.id, actualScore, isCorrect, pts, cash);
      if (isCorrect) correct++;
    });
    res.json({ resolved: preds.length, correct });
  });

  // Coaches API
  app.get("/api/coaches", (req, res) => {
    res.json(storage.getAllCoaches());
  });

  // Admin dashboard stats
  app.get("/api/admin/stats", adminAuth, (req: any, res) => {
    const allUsers = storage.getAllUsers();
    const paidUsers = allUsers.filter(u => u.isPaid);
    const allPlayers = storage.getAllPlayers();
    const allCoaches = storage.getAllCoaches();
    const posts = storage.getAllPosts();
    const pool = storage.getPrizePool();

    res.json({
      totalUsers: allUsers.length,
      paidUsers: paidUsers.length,
      revenue: paidUsers.length * 300,
      prizePool: pool?.totalCollected ?? paidUsers.length * 300,
      adminEarnings: (pool?.totalCollected ?? paidUsers.length * 300) * 0.4,
      totalPlayers: allPlayers.length,
      totalCoaches: allCoaches.length,
      scheduledPosts: posts.filter(p => p.status === "scheduled").length,
      draftPosts: posts.filter(p => p.status === "draft").length,
      hasSeedData: allPlayers.length > 100,
      payplusConnected: !!(process.env.PAYPLUS_API_KEY && process.env.PAYPLUS_SECRET),
    });
  });
}
