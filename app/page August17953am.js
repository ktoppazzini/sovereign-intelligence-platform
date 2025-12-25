// app/page.js
// (Server Component — OK to export metadata here)
import HomeClient from './HomeClient';

export const metadata = {
  title: 'Sovereign Intelligence',
};

export default function Page() {
  return <HomeClient />;
}
