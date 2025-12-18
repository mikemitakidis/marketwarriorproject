import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const dayFileMap: Record<number, string> = {
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
  30: 'day30_graduation.html'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ day: string }> }
) {
  const { day } = await params
  const dayNum = parseInt(day)

  if (isNaN(dayNum) || dayNum < 1 || dayNum > 30) {
    return NextResponse.json({ error: 'Invalid day' }, { status: 400 })
  }

  const filename = dayFileMap[dayNum]
  const contentPath = join(process.cwd(), 'src', 'content', 'days', filename)

  if (!existsSync(contentPath)) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }

  try {
    const content = readFileSync(contentPath, 'utf-8')
    // Extract just the body content, removing DOCTYPE, html, head tags
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    const bodyContent = bodyMatch ? bodyMatch[1] : content

    return new NextResponse(bodyContent, {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error reading content' }, { status: 500 })
  }
}
