import { NextResponse } from 'next/server';
import { getUser, errorResponse } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';
import * as XLSX from 'xlsx';

export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const supabase = createAdminSupabase();

    // Get all trades for user
    const { data: trades, error } = await supabase
      .from('trading_journal')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (error) throw error;

    // Prepare data for Excel
    const excelData = (trades || []).map(trade => ({
      'Date': trade.entry_date?.split('T')[0] || '',
      'Exit Date': trade.exit_date?.split('T')[0] || '',
      'Symbol': trade.symbol || '',
      'Type': trade.trade_type?.toUpperCase() || '',
      'Entry Price': trade.entry_price || '',
      'Exit Price': trade.exit_price || '',
      'Quantity': trade.quantity || '',
      'P&L': trade.pnl || '',
      'Strategy': trade.strategy || '',
      'Emotions': trade.emotions || '',
      'Notes': trade.notes || '',
      'Lessons Learned': trade.lessons_learned || ''
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Main trades sheet
    const ws = XLSX.utils.json_to_sheet(excelData.length > 0 ? excelData : [{ 'No trades': 'Add trades to your journal' }]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 40 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Trades');

    // Create summary sheet
    const tradesList = trades || [];
    const totalTrades = tradesList.length;
    const closedTrades = tradesList.filter(t => t.exit_price !== null);
    const wins = closedTrades.filter(t => parseFloat(t.pnl) > 0).length;
    const totalPnL = tradesList.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
    
    const summaryData = [
      { 'Metric': 'Total Trades', 'Value': totalTrades },
      { 'Metric': 'Closed Trades', 'Value': closedTrades.length },
      { 'Metric': 'Wins', 'Value': wins },
      { 'Metric': 'Losses', 'Value': closedTrades.length - wins },
      { 'Metric': 'Win Rate', 'Value': closedTrades.length > 0 ? `${((wins / closedTrades.length) * 100).toFixed(1)}%` : '0%' },
      { 'Metric': 'Total P&L', 'Value': `$${totalPnL.toFixed(2)}` },
      { 'Metric': 'Average P&L', 'Value': closedTrades.length > 0 ? `$${(totalPnL / closedTrades.length).toFixed(2)}` : '$0.00' },
    ];
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="trading-journal-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Journal export error:', error);
    return errorResponse('Export failed', 500);
  }
}
