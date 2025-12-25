'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const LanguageSelector = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [lang, setLang] = useState('en');

  const handleChange = async (e) => {
    const newLang = e.target.value;
    setLang(newLang);

    startTransition(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', newLang);
      router.push(url.toString());
    });
  };

  return (
    <select
      onChange={handleChange}
      value={lang}
      className="text-black px-2 py-1 rounded bg-white border border-gray-300 shadow-sm"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="es">Español</option>
      <option value="ar">العربية</option>
      <option value="zh">中文</option>
      {/* Add more here if needed */}
    </select>
  );
};

export default LanguageSelector;
