/** Space Arcade visual system: a dark cosmic arcade cabinet with vivid cockpit accents and generous contrast. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const homePath = import.meta.env.BASE_URL;
const notFoundPath = `${import.meta.env.BASE_URL}404`;

function AppRouter() {
  return (
    <Switch>
      <Route path={homePath} component={Home} />
      <Route path={notFoundPath} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
