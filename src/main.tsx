import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof document !== 'undefined') {
  const origGetElementById = document.getElementById.bind(document);
  document.getElementById = function(id: string) {
    const el = origGetElementById(id);
    if (el) return el;
    if (id === 'salesInput' || id === 'salesAmountInput' || id === 'salesAmount') {
      return origGetElementById('salesInput') || origGetElementById('salesAmountInput') || origGetElementById('salesAmount');
    }
    if (id === 'homeSaleValue' || id === 'dashSales') {
      return origGetElementById('homeSaleValue') || origGetElementById('dashSales');
    }
    if (id === 'rangeSalesValue' || id === 'rangeSales') {
      return origGetElementById('rangeSalesValue') || origGetElementById('rangeSales');
    }
    return null;
  };
}

if (typeof window !== 'undefined') {
  (window as any).updateAllSalesDisplays = (newTotal: number | string) => {
    const formatted = typeof newTotal === 'number' ? newTotal.toLocaleString('en-US') : String(newTotal);
    const homeEl = document.getElementById('homeSaleValue');
    if (homeEl) homeEl.innerText = formatted;
    const rangeEl = document.getElementById('rangeSalesValue');
    if (rangeEl) rangeEl.innerText = formatted;
  };
}

createRoot(document.getElementById('root')!).render(<App />);
