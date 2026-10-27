import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { AdminProvider } from './admin/AdminContext';
import AdminLayout from './admin/AdminLayout';
import Login from './admin/Login';
import Setup from './admin/Setup';
import AdminRaces from './admin/Races';
import AdminPhotos from './admin/Photos';
import AdminPhotoGallery from './admin/PhotoGallery';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Results from './pages/Results';
import Photos from './pages/Photos';
import PhotoEvent from './pages/PhotoEvent';
import LiveResults from './pages/LiveResults';
import RaceResults from './pages/RaceResults';

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
  return (
    <section className="section" style={{ paddingTop: '10rem' }}>
      <div className="container text-center">
        <h1 className="section-title">Halaman tidak ditemukan</h1>
        <p className="section-subtitle mx-auto">Periksa kembali alamat yang Anda tuju.</p>
        <a className="btn btn-primary" href="/v2">
          Kembali ke Home
        </a>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicShell />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<Services />} />
          <Route path="results" element={<Results />} />
          <Route path="photos" element={<Photos />} />
          <Route path="photos/:slug" element={<PhotoEvent />} />
          <Route path="hasil" element={<LiveResults />} />
          <Route path="race/:slug" element={<RaceResults />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="admin"
          element={
            <AdminProvider>
              <Outlet />
            </AdminProvider>
          }
        >
          <Route path="login" element={<Login />} />
          <Route path="setup" element={<Setup />} />
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="races" replace />} />
            <Route path="races" element={<AdminRaces />} />
            <Route path="photos" element={<AdminPhotos />} />
            <Route path="photos/:id" element={<AdminPhotoGallery />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
