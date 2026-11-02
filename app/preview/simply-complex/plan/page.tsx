import type { Metadata } from 'next';
import PlanConcept from '@/components/discovery/PlanConcept';
import '../preview.css';
export const metadata: Metadata = { title: 'Plan My Night · Concept preview', robots: { index: false, follow: false } };
export default function PlanPreview() { return <PlanConcept homeHref="/preview/simply-complex" />; }
