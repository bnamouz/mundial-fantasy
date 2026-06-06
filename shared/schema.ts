import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users / Registration ───────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(false),
  paymentRef: text("payment_ref"),
  invoiceNumber: text("invoice_number"),
  registeredAt: text("registered_at").notNull().default(new Date().toISOString()),
  budget: real("budget").notNull().default(100), // virtual currency budget
  totalPoints: integer("total_points").notNull().default(0),
  rank: integer("rank").notNull().default(0),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, registeredAt: true, totalPoints: true, rank: true, isAdmin: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Players ────────────────────────────────────────────────────────────────
export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameHe: text("name_he"),
  country: text("country").notNull(),
  countryCode: text("country_code").notNull(), // e.g. "BRA"
  position: text("position").notNull(), // GK, DEF, MID, FWD
  clubTeam: text("club_team"),
  photoUrl: text("photo_url"),
  jerseyNumber: integer("jersey_number"),
  price: real("price").notNull().default(10), // market price in credits
  priceChange: real("price_change").notNull().default(0), // daily change
  totalPoints: integer("total_points").notNull().default(0),
  goals: integer("goals").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  yellowCards: integer("yellow_cards").notNull().default(0),
  redCards: integer("red_cards").notNull().default(0),
  cleanSheets: integer("clean_sheets").notNull().default(0),
  minutesPlayed: integer("minutes_played").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  trend: text("trend").notNull().default("stable"), // up, down, stable
});

export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

// ─── User's Fantasy Team ─────────────────────────────────────────────────────
export const fantasyTeams = sqliteTable("fantasy_teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  teamName: text("team_name").notNull().default("My Team"),
  formation: text("formation").notNull().default("4-3-3"),
  coachName: text("coach_name"),
  captainId: integer("captain_id"), // player id
  viceCaptainId: integer("vice_captain_id"),
  totalPoints: integer("total_points").notNull().default(0),
  weeklyPoints: integer("weekly_points").notNull().default(0),
});

export const insertFantasyTeamSchema = createInsertSchema(fantasyTeams).omit({ id: true, totalPoints: true, weeklyPoints: true });
export type InsertFantasyTeam = z.infer<typeof insertFantasyTeamSchema>;
export type FantasyTeam = typeof fantasyTeams.$inferSelect;

// ─── Team Players (11 starters + 5 bench) ───────────────────────────────────
export const teamPlayers = sqliteTable("team_players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull().references(() => fantasyTeams.id),
  playerId: integer("player_id").notNull().references(() => players.id),
  slot: integer("slot").notNull(), // 1-11 starters, 12-16 bench
  positionOnField: text("position_on_field"), // e.g. "GK", "LB", "CAM"
  isBench: integer("is_bench", { mode: "boolean" }).notNull().default(false),
  purchasePrice: real("purchase_price").notNull().default(0),
  purchasedAt: text("purchased_at").notNull().default(new Date().toISOString()),
});

export const insertTeamPlayerSchema = createInsertSchema(teamPlayers).omit({ id: true, purchasedAt: true });
export type InsertTeamPlayer = z.infer<typeof insertTeamPlayerSchema>;
export type TeamPlayer = typeof teamPlayers.$inferSelect;

// ─── Player Market Transactions ──────────────────────────────────────────────
export const marketTransactions = sqliteTable("market_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  playerId: integer("player_id").notNull().references(() => players.id),
  type: text("type").notNull(), // buy | sell
  price: real("price").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertTransactionSchema = createInsertSchema(marketTransactions).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type MarketTransaction = typeof marketTransactions.$inferSelect;

// ─── Daily Player Points (Matchday scoring) ──────────────────────────────────
export const matchdayPoints = sqliteTable("matchday_points", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").notNull().references(() => players.id),
  matchday: integer("matchday").notNull(),
  matchDate: text("match_date").notNull(),
  opponent: text("opponent"),
  goals: integer("goals").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  yellowCards: integer("yellow_cards").notNull().default(0),
  redCards: integer("red_cards").notNull().default(0),
  cleanSheet: integer("clean_sheet", { mode: "boolean" }).notNull().default(false),
  minutesPlayed: integer("minutes_played").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  points: integer("points").notNull().default(0),
});

export const insertMatchdayPointsSchema = createInsertSchema(matchdayPoints).omit({ id: true });
export type InsertMatchdayPoints = z.infer<typeof insertMatchdayPointsSchema>;
export type MatchdayPoints = typeof matchdayPoints.$inferSelect;

// ─── Leaderboard snapshot ────────────────────────────────────────────────────
export const leaderboard = sqliteTable("leaderboard", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  rank: integer("rank").notNull(),
  totalPoints: integer("total_points").notNull().default(0),
  weeklyPoints: integer("weekly_points").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export type Leaderboard = typeof leaderboard.$inferSelect;

// ─── Coaches ────────────────────────────────────────────────────────────────
export const coaches = sqliteTable("coaches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  country: text("country").notNull(),
  countryCode: text("country_code").notNull(),
  group: text("group"),
  totalPoints: integer("total_points").notNull().default(0),
  price: real("price").notNull().default(5),
  priceChange: real("price_change").notNull().default(0),
  trend: text("trend").notNull().default("stable"),
});
export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true });
export type InsertCoach = z.infer<typeof insertCoachSchema>;
export type Coach = typeof coaches.$inferSelect;

// ─── Prize Pool & Payouts ───────────────────────────────────────────────────
export const prizePool = sqliteTable("prize_pool", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  totalCollected: real("total_collected").notNull().default(0), // total registration fees
  adminCutPct: real("admin_cut_pct").notNull().default(40),    // % kept by platform
  prizePct: real("prize_pct").notNull().default(60),           // % distributed as prizes
  firstPlacePct: real("first_place_pct").notNull().default(50),
  secondPlacePct: real("second_place_pct").notNull().default(25),
  thirdPlacePct: real("third_place_pct").notNull().default(15),
  consolationPct: real("consolation_pct").notNull().default(10), // split among top 10%
  isFinalized: integer("is_finalized", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});
export type PrizePool = typeof prizePool.$inferSelect;

export const payouts = sqliteTable("payouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  rank: integer("rank").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | cancelled
  paymentMethod: text("payment_method"),  // bank | bit | paybox
  paymentDetails: text("payment_details"), // IBAN / phone
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});
export const insertPayoutSchema = createInsertSchema(payouts).omit({ id: true, createdAt: true });
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;

// ─── Prediction Bets ─────────────────────────────────────────────────────────
export const predictions = sqliteTable("predictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  matchLabel: text("match_label").notNull(), // e.g. "BRA vs FRA"
  predictedScore: text("predicted_score").notNull(), // e.g. "2-1"
  actualScore: text("actual_score"),
  isCorrect: integer("is_correct", { mode: "boolean" }),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  bonusCash: real("bonus_cash").notNull().default(0),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});
export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, createdAt: true, isCorrect: true, pointsAwarded: true, bonusCash: true });
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

// ─── Instagram Post Queue ─────────────────────────────────────────────────────────
export const instagramPosts = sqliteTable("instagram_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // promo | player_update | weekly_top | invite
  content: text("content").notNull(),
  imagePrompt: text("image_prompt"),
  scheduledAt: text("scheduled_at"),
  status: text("status").notNull().default("draft"), // draft | scheduled | posted
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertInstagramPostSchema = createInsertSchema(instagramPosts).omit({ id: true, createdAt: true });
export type InsertInstagramPost = z.infer<typeof insertInstagramPostSchema>;
export type InstagramPost = typeof instagramPosts.$inferSelect;
