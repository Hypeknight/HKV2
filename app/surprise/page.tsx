import type { Metadata } from 'next';
import SurpriseExperience from '@/components/discovery/SurpriseExperience';

export const metadata: Metadata = {
  title: 'Surprise Me',
  description: 'Tell HypeKnight where you are and get one nearby event pick.',
};

export default function SurprisePage() {
  return <SurpriseExperience />;
}
