import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import PitchPage from "@/pages/PitchPage";
import MarketPage from "@/pages/MarketPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import InstagramPage from "@/pages/InstagramPage";
import AdminPage from "@/pages/AdminPage";
import PrizesPage from "@/pages/PrizesPage";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={AuthPage} />
          <Route path="/register" component={AuthPage} />
          <Route component={AuthPage} />
        </Switch>
      </Router>
    );
  }

  return (
    <Router hook={useHashLocation}>
      <Layout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/pitch" component={PitchPage} />
          <Route path="/market" component={MarketPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <Route path="/prizes" component={PrizesPage} />
          <Route path="/instagram" component={InstagramPage} />
          <Route path="/admin" component={AdminPage} />
          <Route component={DashboardPage} />
        </Switch>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
