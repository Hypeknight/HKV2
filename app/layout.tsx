import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/data';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://hypeknight.fun'),

  title: {
    default: 'HypeKnight | Find What’s Happening Tonight',
    template: '%s | HypeKnight',
  },

  description:
    'HypeKnight helps people discover live events, nightlife, promoters, venues, and what is happening here and now.',

  openGraph: {
    title: 'HypeKnight | Find What’s Happening Tonight',
    description:
      'Discover live events, nightlife, promoters, venues, and what is happening here and now.',
    url: 'https://hypeknight.fun',
    siteName: 'HypeKnight',
    i