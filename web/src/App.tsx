import { useEffect } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminProvider } from './admin/AdminContext';
import { AdminTheme } from './admin/AdminTheme';
import AdminLayout from './admin/AdminLayout';
import Login from './admin/Login';
import Setup from './admin/Setup';
import AdminDashboard from './admin/Dashboard';
import AdminRaces from './admin/Races';
import AdminRaceDetail from './admin/RaceDetail';
import AdminPhotos from './admin/Photos';
import AdminPhotoGallery from './admin/PhotoGallery';
import AdminCertificates from './admin/Certificates';
import AdminCertificateDetail from './admin/CertificateDetail';
import AdminLeads from './admin/Leads';
import AdminAudit from './admin/Audit';
import AdminSettings from './admin/Settings';
import AdminUsers from './admin/Users';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Results from './pages/Results';
import Photos from './pages/Photos';
import PhotoEvent from './pages/PhotoEvent';
import EventDetail from './pages/EventDetail';
import Contact from './pages/Contact';
import Faq from './pages/Faq';
import Clients from './pages/Clients';
import { Privacy, Terms } from './pages/Legal';
import { useI18n } from './i18n/I18nProvider';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function PublicShell() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}

function NotFound() {
  const { t } = useI18n();

  return (
    <section className="section" style={{ paddingTop: '10rem' }}>
      <div className="container text-center">
        <h1 className="section-title">{t('notFound.title')}</h1>
        <p className="section-subtitle mx-auto">{t('notFound.text')}</p>
        <Link className="btn btn-primary" to="/">
          {t('notFound.home')}
        </Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <ErrorBoundary>
        <Routes>
          <Route element={<PublicShell />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="services" element={<Services />} />
            <Route path="events/:slug" element={<EventDetail />} />
            <Route path="results" element={<Results />} />
            <Route path="photos" element={<Photos />} />
            <Route path="photos/:slug" element={<PhotoEvent />} />
            <Route path="contact" element={<Contact />} />
            <Route path="faq" element={<Faq />} />
            <Route path="clients" element={<Clients />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="hasil" element={<Navigate to="/results" replace />} />
            <Route path="race/:slug" element={<Navigate to="/results" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route
            path="admin"
            element={
              <AdminProvider>
                <AdminTheme>
                  <Outlet />
                </AdminTheme>
              </AdminProvider>
            }
          >
            <Route path="login" element={<Login />} />
            <Route path="setup" element={<Setup />} />
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="races" element={<AdminRaces />} />
              <Route path="races/:id" element={<AdminRaceDetail />} />
              <Route path="photos" element={<AdminPhotos />} />
              <Route path="photos/:id" element={<AdminPhotoGallery />} />
              <Route path="sertifikat" element={<AdminCertificates />} />
              <Route path="sertifikat/:slug" element={<AdminCertificateDetail />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="audit" element={<AdminAudit />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>
          </Route>
        </Routes>
      </ErrorBoundary>
    </>
  );
}
