import type { ReactNode } from 'react';

import {
  Benefits,
  FinalCallToAction,
  FrequentlyAskedQuestions,
  Hero,
  HowItWorks,
  Plans,
  ProblemAndSolution,
  Provenance,
  Security,
} from '@/components/landing/landing-content';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default function HomePage(): ReactNode {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Hero />
        <ProblemAndSolution />
        <Benefits />
        <Provenance />
        <HowItWorks />
        <Plans />
        <Security />
        <FrequentlyAskedQuestions />
        <FinalCallToAction />
      </main>
      <SiteFooter />
    </>
  );
}
