// File: /app/test_translation/components/translation_Header.js
'use client';

import Link from 'next/link';
import styles from '../../test_page/TestPage.module.css';
import { FaHome, FaBrain, FaChartBar, FaCog } from 'react-icons/fa';

// ✅ Exported variables for dynamic nav label substitution
export const navHome = 'Home';
export const navAssistant = 'Assistant';
export const navDashboard = 'Dashboard';
export const navReform = 'Reform Engine';

export default function Header() {
  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.navItem} legacyBehavior>
        <FaHome className={styles.navIcon} color="#f87171" />
        {navHome}
      </Link>
      <Link href="/assistant" className={styles.navItem} legacyBehavior>
        <FaBrain className={styles.navIcon} color="#60a5fa" />
        {navAssistant}
      </Link>
      <Link href="/dashboard" className={styles.navItem} legacyBehavior>
        <FaChartBar className={styles.navIcon} color="#34d399" />
        {navDashboard}
      </Link>
      <Link href="/reform" className={styles.navItem} legacyBehavior>
        <FaCog className={styles.navIcon} color="#facc15" />
        {navReform}
      </Link>
    </nav>
  );
}
