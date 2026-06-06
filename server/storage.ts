import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import {
  users, players, fantasyTeams, teamPlayers, marketTransactions,
  matchdayPoints, leaderboard, instagramPosts, prizePool, payouts, predictions, coaches,
  type User, type InsertUser, type Player, type InsertPlayer,
  type FantasyTeam, type InsertFantasyTeam, type TeamPlayer, type InsertTeamPlayer,
  type MarketTransaction, type InsertTransaction,
  type MatchdayPoints, type InsertMatchdayPoints,
  type Leaderboard, type InstagramPost, type InsertInstagramPost,
  type PrizePool, type Payout, type InsertPayout, type Prediction, type InsertPrediction,
  type Coach, type InsertCoach,
} from "@shared/schema";

const sqlite = new Database("data.db");
const db = drizzle(sqlite);

// Run migrations
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 0,
    payment_ref TEXT,
    invoice_number TEXT,
    registered_at TEXT NOT NULL DEFAULT (datetime('now')),
    budget REAL NOT NULL DEFAULT 100,
    total_points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL DEFAULT 0,
    is_admin INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_ar TEXT,
    name_he TEXT,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL,
    position TEXT NOT NULL,
    club_team TEXT,
    photo_url TEXT,
    jersey_number INTEGER,
    price REAL NOT NULL DEFAULT 10,
    price_change REAL NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    goals INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    yellow_cards INTEGER NOT NULL DEFAULT 0,
    red_cards INTEGER NOT NULL DEFAULT 0,
    clean_sheets INTEGER NOT NULL DEFAULT 0,
    minutes_played INTEGER NOT NULL DEFAULT 0,
    saves INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    trend TEXT NOT NULL DEFAULT 'stable'
  );
  CREATE TABLE IF NOT EXISTS fantasy_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    team_name TEXT NOT NULL DEFAULT 'My Team',
    formation TEXT NOT NULL DEFAULT '4-3-3',
    coach_name TEXT,
    captain_id INTEGER,
    vice_captain_id INTEGER,
    total_points INTEGER NOT NULL DEFAULT 0,
    weekly_points INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS team_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES fantasy_teams(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    slot INTEGER NOT NULL,
    position_on_field TEXT,
    is_bench INTEGER NOT NULL DEFAULT 0,
    purchase_price REAL NOT NULL DEFAULT 0,
    purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS market_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    type TEXT NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS matchday_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id),
    matchday INTEGER NOT NULL,
    match_date TEXT NOT NULL,
    opponent TEXT,
    goals INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    yellow_cards INTEGER NOT NULL DEFAULT 0,
    red_cards INTEGER NOT NULL DEFAULT 0,
    clean_sheet INTEGER NOT NULL DEFAULT 0,
    minutes_played INTEGER NOT NULL DEFAULT 0,
    saves INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rank INTEGER NOT NULL,
    total_points INTEGER NOT NULL DEFAULT 0,
    weekly_points INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS instagram_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    image_prompt TEXT,
    scheduled_at TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS coaches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL,
    "group" TEXT,
    total_points INTEGER NOT NULL DEFAULT 0,
    price REAL NOT NULL DEFAULT 5,
    price_change REAL NOT NULL DEFAULT 0,
    trend TEXT NOT NULL DEFAULT 'stable'
  );
  CREATE TABLE IF NOT EXISTS prize_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_collected REAL NOT NULL DEFAULT 0,
    admin_cut_pct REAL NOT NULL DEFAULT 40,
    prize_pct REAL NOT NULL DEFAULT 60,
    first_place_pct REAL NOT NULL DEFAULT 50,
    second_place_pct REAL NOT NULL DEFAULT 25,
    third_place_pct REAL NOT NULL DEFAULT 15,
    consolation_pct REAL NOT NULL DEFAULT 10,
    is_finalized INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rank INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    payment_details TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    match_label TEXT NOT NULL,
    predicted_score TEXT NOT NULL,
    actual_score TEXT,
    is_correct INTEGER,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    bonus_cash REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserById(id: number): User | undefined;
  getUserByEmail(email: string): User | undefined;
  createUser(data: InsertUser): User;
  updateUserPayment(id: number, paymentRef: string, invoiceNumber: string): User | undefined;
  getAllUsers(): User[];
  updateUserBudget(id: number, budget: number): void;
  updateUserPoints(id: number, points: number): void;
  setAdmin(id: number): void;

  // Players
  getAllPlayers(): Player[];
  getPlayer(id: number): Player | undefined;
  createPlayer(data: InsertPlayer): Player;
  updatePlayerStats(id: number, data: Partial<Player>): void;
  getPlayersByPosition(position: string): Player[];

  // Fantasy Teams
  getTeamByUser(userId: number): FantasyTeam | undefined;
  createTeam(data: InsertFantasyTeam): FantasyTeam;
  updateTeam(id: number, data: Partial<FantasyTeam>): void;

  // Team Players
  getTeamPlayers(teamId: number): (TeamPlayer & { player: Player })[];
  addPlayerToTeam(data: InsertTeamPlayer): TeamPlayer;
  removePlayerFromTeam(teamId: number, playerId: number): void;
  updatePlayerSlot(teamId: number, playerId: number, slot: number, isBench: boolean): void;

  // Transactions
  getUserTransactions(userId: number): MarketTransaction[];
  createTransaction(data: InsertTransaction): MarketTransaction;

  // Matchday Points
  getMatchdayPoints(matchday: number): MatchdayPoints[];
  addMatchdayPoints(data: InsertMatchdayPoints): MatchdayPoints;

  // Leaderboard
  getLeaderboard(): (Leaderboard & { user: User })[];

  // Instagram Posts
  getAllPosts(): InstagramPost[];
  createPost(data: InsertInstagramPost): InstagramPost;
  updatePostStatus(id: number, status: string): void;

  // Prize Pool
  getPrizePool(): PrizePool | undefined;
  upsertPrizePool(data: Partial<PrizePool>): PrizePool;
  addToPrizePool(amount: number): void;

  // Payouts
  getAllPayouts(): (Payout & { user: User })[];
  getPayout(userId: number): Payout | undefined;
  createPayout(data: InsertPayout): Payout;
  updatePayoutStatus(id: number, status: string, paidAt?: string): void;
  updatePayoutDetails(id: number, method: string, details: string): void;

  // Predictions
  getUserPredictions(userId: number): Prediction[];
  createPrediction(data: InsertPrediction): Prediction;
  resolvePrediction(id: number, actualScore: string, isCorrect: boolean, pts: number, cash: number): void;
  getPredictionsByMatch(matchLabel: string): Prediction[];

  // Coaches
  getAllCoaches(): Coach[];
  createCoach(data: InsertCoach): Coach;
  clearPlayers(): void;
  clearCoaches(): void;
}

export const storage: IStorage = {
  // ── Users ──
  getUser(id) {
    return db.select().from(users).where(eq(users.id, id)).get();
  },
  getUserById(id) {
    return db.select().from(users).where(eq(users.id, id)).get();
  },
  setAdmin(id) {
    db.update(users).set({ isAdmin: true }).where(eq(users.id, id)).run();
  },
  getUserByEmail(email) {
    return db.select().from(users).where(eq(users.email, email)).get();
  },
  createUser(data) {
    return db.insert(users).values(data).returning().get();
  },
  updateUserPayment(id, paymentRef, invoiceNumber) {
    return db.update(users).set({ isPaid: true, paymentRef, invoiceNumber }).where(eq(users.id, id)).returning().get();
  },
  getAllUsers() {
    return db.select().from(users).all();
  },
  updateUserBudget(id, budget) {
    db.update(users).set({ budget }).where(eq(users.id, id)).run();
  },
  updateUserPoints(id, points) {
    db.update(users).set({ totalPoints: points }).where(eq(users.id, id)).run();
  },

  // ── Players ──
  getAllPlayers() {
    return db.select().from(players).where(eq(players.isActive, true)).all();
  },
  getPlayer(id) {
    return db.select().from(players).where(eq(players.id, id)).get();
  },
  createPlayer(data) {
    return db.insert(players).values(data).returning().get();
  },
  updatePlayerStats(id, data) {
    db.update(players).set(data).where(eq(players.id, id)).run();
  },
  getPlayersByPosition(position) {
    return db.select().from(players).where(and(eq(players.position, position), eq(players.isActive, true))).all();
  },

  // ── Fantasy Teams ──
  getTeamByUser(userId) {
    return db.select().from(fantasyTeams).where(eq(fantasyTeams.userId, userId)).get();
  },
  createTeam(data) {
    return db.insert(fantasyTeams).values(data).returning().get();
  },
  updateTeam(id, data) {
    db.update(fantasyTeams).set(data).where(eq(fantasyTeams.id, id)).run();
  },

  // ── Team Players ──
  getTeamPlayers(teamId) {
    const rows = db.select().from(teamPlayers)
      .innerJoin(players, eq(teamPlayers.playerId, players.id))
      .where(eq(teamPlayers.teamId, teamId))
      .all();
    return rows.map(r => ({ ...r.team_players, player: r.players }));
  },
  addPlayerToTeam(data) {
    return db.insert(teamPlayers).values(data).returning().get();
  },
  removePlayerFromTeam(teamId, playerId) {
    db.delete(teamPlayers).where(and(eq(teamPlayers.teamId, teamId), eq(teamPlayers.playerId, playerId))).run();
  },
  updatePlayerSlot(teamId, playerId, slot, isBench) {
    db.update(teamPlayers).set({ slot, isBench }).where(and(eq(teamPlayers.teamId, teamId), eq(teamPlayers.playerId, playerId))).run();
  },

  // ── Transactions ──
  getUserTransactions(userId) {
    return db.select().from(marketTransactions).where(eq(marketTransactions.userId, userId)).orderBy(desc(marketTransactions.id)).all();
  },
  createTransaction(data) {
    return db.insert(marketTransactions).values(data).returning().get();
  },

  // ── Matchday Points ──
  getMatchdayPoints(matchday) {
    return db.select().from(matchdayPoints).where(eq(matchdayPoints.matchday, matchday)).all();
  },
  addMatchdayPoints(data) {
    return db.insert(matchdayPoints).values(data).returning().get();
  },

  // ── Leaderboard ──
  getLeaderboard() {
    const rows = db.select().from(leaderboard)
      .innerJoin(users, eq(leaderboard.userId, users.id))
      .orderBy(asc(leaderboard.rank))
      .all();
    return rows.map(r => ({ ...r.leaderboard, user: r.users }));
  },

  // ── Instagram Posts ──
  getAllPosts() {
    return db.select().from(instagramPosts).orderBy(desc(instagramPosts.id)).all();
  },
  createPost(data) {
    return db.insert(instagramPosts).values(data).returning().get();
  },
  updatePostStatus(id, status) {
    db.update(instagramPosts).set({ status }).where(eq(instagramPosts.id, id)).run();
  },

  // ── Prize Pool ──
  getPrizePool() {
    return db.select().from(prizePool).get();
  },
  upsertPrizePool(data) {
    const existing = db.select().from(prizePool).get();
    if (existing) {
      return db.update(prizePool).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(prizePool.id, existing.id)).returning().get();
    }
    return db.insert(prizePool).values({ ...data } as any).returning().get();
  },
  addToPrizePool(amount) {
    const existing = db.select().from(prizePool).get();
    if (existing) {
      db.update(prizePool).set({ totalCollected: existing.totalCollected + amount, updatedAt: new Date().toISOString() }).where(eq(prizePool.id, existing.id)).run();
    } else {
      db.insert(prizePool).values({ totalCollected: amount } as any).run();
    }
  },

  // ── Payouts ──
  getAllPayouts() {
    const rows = db.select().from(payouts).innerJoin(users, eq(payouts.userId, users.id)).orderBy(asc(payouts.rank)).all();
    return rows.map(r => ({ ...r.payouts, user: r.users }));
  },
  getPayout(userId) {
    return db.select().from(payouts).where(eq(payouts.userId, userId)).get();
  },
  createPayout(data) {
    return db.insert(payouts).values(data).returning().get();
  },
  updatePayoutStatus(id, status, paidAt) {
    db.update(payouts).set({ status, ...(paidAt ? { paidAt } : {}) }).where(eq(payouts.id, id)).run();
  },
  updatePayoutDetails(id, method, details) {
    db.update(payouts).set({ paymentMethod: method, paymentDetails: details }).where(eq(payouts.id, id)).run();
  },

  // ── Predictions ──
  getUserPredictions(userId) {
    return db.select().from(predictions).where(eq(predictions.userId, userId)).orderBy(desc(predictions.id)).all();
  },
  createPrediction(data) {
    return db.insert(predictions).values(data).returning().get();
  },
  resolvePrediction(id, actualScore, isCorrect, pts, cash) {
    db.update(predictions).set({ actualScore, isCorrect, pointsAwarded: pts, bonusCash: cash }).where(eq(predictions.id, id)).run();
  },
  getPredictionsByMatch(matchLabel) {
    return db.select().from(predictions).where(eq(predictions.matchLabel, matchLabel)).all();
  },

  // ── Coaches ──
  getAllCoaches() {
    return db.select().from(coaches).all();
  },
  createCoach(data) {
    return db.insert(coaches).values(data).returning().get();
  },
  clearPlayers() {
    db.delete(players).run();
  },
  clearCoaches() {
    db.delete(coaches).run();
  },
};
