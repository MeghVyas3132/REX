import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WorkflowHome } from "./pages/WorkflowHome";
import { WorkflowStudio } from "./pages/WorkflowStudio";
import { Executions } from "./pages/Executions";
import { History } from "./pages/History";
import { OAuthManager } from "./pages/OAuthManager";
import NotFound from "./pages/NotFound";
import GoogleOAuthHelp from "./pages/GoogleOAuthHelp";
import GoogleOAuthCallback from "./pages/GoogleOAuthCallback";
import MicrosoftOAuthCallback from "./pages/MicrosoftOAuthCallback";
import Layout from "./components/Layout";
import { AuthProvider, ProtectedRoute, LoginPage, RegisterPage, UnauthorizedPage } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/oauth/google/help" element={<GoogleOAuthHelp />} />
            <Route path="/google-oauth-callback" element={<GoogleOAuthCallback />} />
            <Route path="/microsoft-oauth-callback" element={<MicrosoftOAuthCallback />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <WorkflowHome />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/studio" element={
              <ProtectedRoute>
                <Layout>
                  <WorkflowStudio />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/executions" element={
              <ProtectedRoute>
                <Layout>
                  <Executions />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <Layout>
                  <History />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/oauth" element={
              <ProtectedRoute>
                <Layout>
                  <OAuthManager />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
