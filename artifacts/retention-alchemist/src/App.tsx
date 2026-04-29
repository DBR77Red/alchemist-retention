import { Switch, Route, Router as WouterRouter } from "wouter";
import { SimulationProvider } from "@/context/SimulationContext";
import { ChallengeProvider } from "@/context/ChallengeContext";
import Dashboard from "@/pages/Dashboard";
import CareerHub from "@/pages/CareerHub";
import ChallengePage from "@/pages/ChallengePage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CareerHub} />
      <Route path="/challenge/:id" component={ChallengePage} />
      <Route path="/sandbox" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ChallengeProvider>
      <SimulationProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </SimulationProvider>
    </ChallengeProvider>
  );
}

export default App;
