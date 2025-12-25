// components/LanguagePicker.client.jsx
'use client';

import dynamic from 'next/dynamic';

// Your real interactive picker component should be at '@/components/LanguagePicker'.
// We load it on the client only.
const LanguagePicker = dynamic(() => import('@/components/LanguagePicker'), { ssr: false });

export default function LanguagePickerClient(props) {
  return <LanguagePicker {...props} />;
}
