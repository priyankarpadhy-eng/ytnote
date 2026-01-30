import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Landing from './pages/Landing';
import NoteApp from './pages/NoteApp';
import GlobalStudyPage from './pages/GlobalStudyPage';

import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import SupportPage from './pages/SupportPage';
import AboutUs from './pages/AboutUs';
import UIPreview from './pages/UIPreview';
import NotionCallback from './pages/NotionCallback';
import IntegrationsPage from './pages/IntegrationsPage';
import ProfilePage from './pages/ProfilePage';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import ExtensionSidebar from './pages/ExtensionSidebar';
import CapturePage from './pages/CapturePage';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<NoteApp />} />
              <Route path="/sidebar" element={<ExtensionSidebar />} />
              <Route path="/global-map" element={<GlobalStudyPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/ui-preview" element={<UIPreview />} />
              <Route path="/auth/notion/callback" element={<NotionCallback />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/capture" element={<CapturePage />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
