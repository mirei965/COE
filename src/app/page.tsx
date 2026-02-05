'use client';

import { PageLayout } from '@/components/layout/PageLayout';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { HomeHero } from '@/components/home/HomeHero';
import { MorningCheckin } from '@/components/home/MorningCheckin';
import { NapQuickLog } from '@/components/home/NapQuickLog';
import { DayStamps } from '@/components/home/DayStamps';
import { NightReview } from '@/components/home/NightReview';
import { AppTutorial } from '@/components/home/AppTutorial';

export default function Home() {
  return (
    <PageLayout title="服薬体調管理ログ" headerActions={<ThemeToggle />}>
      <AppTutorial />
      <div className="space-y-6 max-w-lg mx-auto">
        <HomeHero />

        <div className="space-y-4">
          <section>
            <MorningCheckin />
          </section>

          <section>
            <NapQuickLog />
          </section>

          <section>
            <DayStamps />
          </section>

          <section>
            <NightReview />
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
