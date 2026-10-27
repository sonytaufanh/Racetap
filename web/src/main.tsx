import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../../assets/css/custom.css';
import './styles/app.css';

import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { APP } from './payload';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={APP.basename || undefined}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
