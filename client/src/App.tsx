import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import MoneyMap from "@/pages/MoneyMap";
import Politicians from "@/pages/Politicians";
import PoliticianTimeline from "@/pages/PoliticianTimeline";
import { DataImportPage } from "@/pages/DataImportPage";

import About from "@/pages/About";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/money-map" component={MoneyMap} />
      <Route path="/politicians" component={Politicians} />
      <Route path="/politicians/:id/timeline" component={PoliticianTimeline} />
      <Route path="/data-management" component={DataImportPage} />

      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow">
            <Router />
          </main>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
