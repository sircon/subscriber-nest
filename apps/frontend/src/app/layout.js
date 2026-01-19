import { jsx as _jsx } from 'react/jsx-runtime';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
export const metadata = {
  title: 'SubscriberNest',
  description: 'Sync and export your subscriber list from your ESP',
};
export default function RootLayout({ children }) {
  return _jsx('html', {
    lang: 'en',
    children: _jsx('body', {
      children: _jsx(AuthProvider, { children: children }),
    }),
  });
}
