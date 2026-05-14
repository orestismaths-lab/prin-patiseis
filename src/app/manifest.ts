export default function manifest() {
  return {
    name: 'Πριν Πατήσεις',
    short_name: 'Πριν Πατήσεις',
    description: 'Έλεγξε αν ένα μήνυμα είναι ύποπτο πριν πατήσεις link ή δώσεις στοιχεία.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    lang: 'el',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
    // Android share target: share text/URLs directly into the app
    share_target: {
      action: '/',
      method: 'GET',
      params: { text: 'text', url: 'url' },
    },
  }
}
