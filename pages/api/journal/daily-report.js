import { getJournalUser, getServiceSupabase } from '../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/daily-report
 * GET: Fetch daily report for a specific date (query: ?date=YYYY-MM-DD)
 * POST: Create or update daily report
 */
export default async function handler(req, res) {
  try {
    const user = await getJournalUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.api, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
      const { date, range } = req.query;

      if (range) {
        // Fetch range of reports (e.g., last 30 days)
        const days = parseInt(range) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: reports, error } = await supabase
          .from('journal_daily_reports')
          .select('*')
          .eq('journal_user_id', user.id)
          .gte('report_date', startDate.toISOString().split('T')[0])
          .order('report_date', { ascending: false });

        if (error) {
          logger.error('Error fetching daily reports:', error);
          return res.status(500).json({ error: 'Failed to fetch reports' });
        }

        return res.status(200).json({ reports });
      }

      // Single date
      const reportDate = date || new Date().toISOString().split('T')[0];

      const { data: report, error } = await supabase
        .from('journal_daily_reports')
        .select('*')
        .eq('journal_user_id', user.id)
        .eq('report_date', reportDate)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching daily report:', error);
        return res.status(500).json({ error: 'Failed to fetch report' });
      }

      // Get trades for this day to auto-calculate stats
      const dayStart = new Date(reportDate);
      const dayEnd = new Date(reportDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data: trades } = await supabase
        .from('journal_trades')
        .select('*')
        .eq('journal_user_id', user.id)
        .gte('entry_date', dayStart.toISOString())
        .lt('entry_date', dayEnd.toISOString());

      const calculatedStats = {
        total_trades: trades?.length || 0,
        winning_trades: trades?.filter(t => (t.pnl_amount || 0) > 0).length || 0,
        losing_trades: trades?.filter(t => (t.pnl_amount || 0) < 0).length || 0,
        daily_pnl: trades?.reduce((sum, t) => sum + (t.pnl_amount || 0), 0) || 0,
        daily_r_multiple: trades?.reduce((sum, t) => sum + (t.r_multiple || 0), 0) || 0,
      };

      return res.status(200).json({
        report: report || null,
        calculatedStats,
        date: reportDate,
      });
    }

    if (req.method === 'POST') {
      const {
        report_date,
        discipline_score,
        execution_score,
        risk_management_score,
        followed_plan,
        stayed_within_risk,
        journaled_all_trades,
        sleep_quality,
        stress_level,
        focus_level,
        pre_market_plan,
        post_market_review,
        lessons_learned,
        improvement_focus,
      } = req.body;

      const date = report_date || new Date().toISOString().split('T')[0];

      // Calculate stats from trades
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data: trades } = await supabase
        .from('journal_trades')
        .select('*')
        .eq('journal_user_id', user.id)
        .gte('entry_date', dayStart.toISOString())
        .lt('entry_date', dayEnd.toISOString());

      const total_trades = trades?.length || 0;
      const winning_trades = trades?.filter(t => (t.pnl_amount || 0) > 0).length || 0;
      const losing_trades = trades?.filter(t => (t.pnl_amount || 0) < 0).length || 0;
      const daily_pnl = trades?.reduce((sum, t) => sum + (t.pnl_amount || 0), 0) || 0;
      const daily_r_multiple = trades?.reduce((sum, t) => sum + (t.r_multiple || 0), 0) || 0;

      // Calculate consistency score
      let consistency_score = 50;
      if (followed_plan) consistency_score += 15;
      if (stayed_within_risk) consistency_score += 15;
      if (journaled_all_trades) consistency_score += 10;
      if (discipline_score) consistency_score += discipline_score;
      consistency_score = Math.min(100, consistency_score);

      const reportData = {
        journal_user_id: user.id,
        report_date: date,
        total_trades,
        winning_trades,
        losing_trades,
        daily_pnl,
        daily_r_multiple,
        discipline_score: discipline_score ? parseInt(discipline_score) : null,
        execution_score: execution_score ? parseInt(execution_score) : null,
        risk_management_score: risk_management_score ? parseInt(risk_management_score) : null,
        followed_plan: followed_plan ?? null,
        stayed_within_risk: stayed_within_risk ?? null,
        journaled_all_trades: journaled_all_trades ?? null,
        sleep_quality: sleep_quality ? parseInt(sleep_quality) : null,
        stress_level: stress_level ? parseInt(stress_level) : null,
        focus_level: focus_level ? parseInt(focus_level) : null,
        pre_market_plan: pre_market_plan || null,
        post_market_review: post_market_review || null,
        lessons_learned: lessons_learned || null,
        improvement_focus: improvement_focus || null,
        consistency_score,
      };

      const { data: report, error } = await supabase
        .from('journal_daily_reports')
        .upsert(reportData, { onConflict: 'journal_user_id,report_date' })
        .select()
        .single();

      if (error) {
        logger.error('Error saving daily report:', error);
        return res.status(500).json({ error: 'Failed to save report' });
      }

      return res.status(200).json(report);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    logger.error('Journal daily report API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
