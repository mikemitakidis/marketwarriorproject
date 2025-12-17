import { gateDashboard, requireProfile } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

const DAY_FILE_MAP: Record<number, string> = {
  1: 'day1.html',
  2: 'day2.html',
  3: 'day3.html',
  4: 'day4.html',
  5: 'day5.html',
  6: 'day6.html',
  7: 'day7.html',
  8: 'day8.html',
  9: 'day9.html',
  10: 'day10.html',
  11: 'day11.html',
  12: 'day12.html',
  13: 'day13.html',
  14: 'day14.html',
  15: 'day15_risk_management.html',
  16: 'day16_ma_crossovers.html',
  17: 'day17_fibonacci.html',
  18: 'day18_backtesting.html',
  19: 'day19_trading_plan_roi.html',
  20: 'day20_trading_psychology.html',
  21: 'day21_developing_strategy.html',
  22: 'day22_volatility_trading.html',
  23: 'day23_copy_trading.html',
  24: 'day24_portfolio_rebalancing.html',
  25: 'day25_portfolio_monitoring.html',
  26: 'day26_strategy_adjustment.html',
  27: 'day27_trade_journaling.html',
  28: 'day28_economic_indicators.html',
  29: 'day29_smart_goals.html',
  30: 'day30_graduation.html',
};

async function loadDayHtml(day: number): Promise<string> {
  // 1) Try DB first (if you populated public.course_content)
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from('course_content')
      .select('html_content')
      .eq('day', day)
      .maybeSingle();

    const html = (data as any)?.html_content as string | undefined;
    if (html && html.trim().length > 0) return html;
  } catch {
    // Table may not exist yet – fallback to local content.
  }

  // 2) Fallback to local HTML files bundled with the project
  const file = DAY_FILE_MAP[day];
  if (!file) return `<h1>Day ${day} not found</h1>`;

  const filePath = path.join(process.cwd(), 'src', 'content', 'days', file);
  return fs.readFileSync(filePath, 'utf8');
}

export default async function DayPage({ params }: { params: { day: string } }) {
  await gateDashboard();
  await requireProfile();

  const day = Math.max(1, Math.min(30, Number(params.day)));
  const html = await loadDayHtml(day);

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <iframe
        title={`Day ${day}`}
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    </main>
  );
}
