import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/ui/theme-provider"
import { Toaster } from "./components/ui/toaster"
import { AuthProvider } from "./contexts/AuthContext"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { DashboardLayout } from "./components/DashboardLayout"
import { Dashboard } from "./pages/Dashboard"
import { CreatePost } from "./pages/CreatePost"
import { Calendar } from "./pages/Calendar"
import { MediaLibrary } from "./pages/MediaLibrary"
import { Analytics } from "./pages/Analytics"
import { Inbox } from "./pages/Inbox"
import { Team } from "./pages/Team"
import { Settings } from "./pages/Settings"
import { Automation } from "./pages/Automation"
import { AdsManager } from "./pages/AdsManager"
import { AboutUs } from "./pages/AboutUs"
import { ContactUs } from "./pages/ContactUs"
import { PrivacyPolicy } from "./pages/PrivacyPolicy"
import { TermsOfService } from "./pages/TermsOfService"
import { HelpCenter } from "./pages/HelpCenter"
import { DataDeletion } from "./pages/DataDeletion"
import { BlankPage } from "./pages/BlankPage"

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="create" element={<CreatePost />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="team" element={<Team />} />
              <Route path="automation" element={<Automation />} />
              <Route path="ads" element={<AdsManager />} />
              <Route path="settings" element={<Settings />} />
              <Route path="about" element={<AboutUs />} />
              <Route path="contact" element={<ContactUs />} />
              <Route path="help" element={<HelpCenter />} />
              <Route path="data-deletion" element={<DataDeletion />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="terms" element={<TermsOfService />} />
            </Route>
            <Route path="*" element={<BlankPage />} />
          </Routes>
        </Router>
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App