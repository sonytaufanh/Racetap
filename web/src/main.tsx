import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../../assets/css/custom.css';
import './styles/app.css';
import './styles/theme.css';
import './styles/ui.css';
import './styles/admin.css';
import './certificate/certificate.css';

import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { ToastProvider } from './components/Toast';
import { I18nProvider } from './i18n/I18nProvider';
import { initTheme } from './lib/theme';
import { APP } from './payload';
import App from './App';

initTheme();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={APP.basename || undefined}>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);
