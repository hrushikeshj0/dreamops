import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
import './production.css';
import './pricing.css';
import './purchases.css';
import './demo.css';
createRoot(document.getElementById('root')).render(<App/>);
