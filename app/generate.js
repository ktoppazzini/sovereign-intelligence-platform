import './globals.css';
import Header from '../components/Header';

export const metadata = {
  title: 'Sovereign Intelligence',
  description: 'Powered by Sovereign OPS™',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
// Page to trigger multilingual PDF report
