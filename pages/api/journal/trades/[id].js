import { getJournalUser, getServiceSupabase } from '../../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../../lib/ratelimit';
import logger from '../../../../lib/logger';

/**
 * API: /api/journal/trades/[id]
 * GET: Fetch single trade with tags
 * PUT: Update a trade
 * DELETE: Delete a trade
 */
export default async function handler(req, res) {
  try {
    const user = await getJournalUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Trade ID required' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.api, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    // Verify ownership (only fetch needed fields)
    const { data: existingTrade, error: fetchError } = await supabase
      .from('journal_trades')
      .select('id, entry_price, exit_price, quantity, direction, stop_loss, commission, swap_fees, entry_date, exit_date, initial_risk_amount, status')
      .eq('id', id)
      .eq('journal_user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error fetching trade:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch trade' });
    }

    if (!existingTrade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    if (req.method === 'GET') {
      // Fetch with tags
      const { data: trade, error } = await supabase
        .from('journal_trades')
        .select('*, journal_trade_tags(tag_id, journal_tags(id, name, category, color))')
        .eq('id', id)
        .eq('journal_user_id', user.id)
        .single();

      if (error) {
        logger.error('Error fetching trade:', error);
        return res.status(500).json({ error: 'Failed to fetch trade' });
      }

      // Flatten tags
      const tradeWithTags = {
        ...trade,
        tags: trade.journal_trade_tags?.map(tt => tt.journal_tags).filter(Boolean) || [],
        journal_trade_tags: undefined,
      };

      return res.status(200).json(tradeWithTags);
    }

    if (req.method === 'PUT') {
      const {
        symbol,
        direction,
        asset_class,
        entry_price,
        entry_date,
        quantity,
        exit_price,
        exit_date,
        stop_loss,
        take_profit,
        max_adverse_excursion,
        max_favorable_excursion,
        execution_score,
        confidence_rating,
        timeframe,
        session,
        strategy,
        notes,
        pre_trade_plan,
        post_trade_review,
        screenshot_url,
        status,
        commission,
        swap_fees,
        tag_ids,
      } = req.body;

      const updates = {};

      // Update basic fields if provided
      if (symbol !== undefined) updates.symbol = symbol.toUpperCase();
      if (direction !== undefined) {
        if (!['long', 'short'].includes(direction)) {
          return res.status(400).json({ error: 'Direction must be "long" or "short"' });
        }
        updates.direction = direction;
      }
      if (asset_class !== undefined) updates.asset_class = asset_class;
      if (entry_price !== undefined) {
        const parsed = parseFloat(entry_price);
        if (isNaN(parsed) || parsed <= 0) {
          return res.status(400).json({ error: 'Entry price must be greater than 0' });
        }
        updates.entry_price = parsed;
      }
      if (entry_date !== undefined) updates.entry_date = entry_date;
      if (quantity !== undefined) {
        const parsed = parseFloat(quantity);
        if (isNaN(parsed) || parsed <= 0) {
          return res.status(400).json({ error: 'Quantity must be greater than 0' });
        }
        updates.quantity = parsed;
      }
      if (exit_price !== undefined) updates.exit_price = exit_price ? parseFloat(exit_price) : null;
      if (exit_date !== undefined) updates.exit_date = exit_date || null;
      if (stop_loss !== undefined) updates.stop_loss = stop_loss ? parseFloat(stop_loss) : null;
      if (take_profit !== undefined) updates.take_profit = take_profit ? parseFloat(take_profit) : null;
      if (max_adverse_excursion !== undefined) updates.max_adverse_excursion = max_adverse_excursion ? parseFloat(max_adverse_excursion) : null;
      if (max_favorable_excursion !== undefined) updates.max_favorable_excursion = max_favorable_excursion ? parseFloat(max_favorable_excursion) : null;
      if (execution_score !== undefined) updates.execution_score = execution_score ? parseInt(execution_score) : null;
      if (confidence_rating !== undefined) updates.confidence_rating = confidence_rating ? parseInt(confidence_rating) : null;
      if (timeframe !== undefined) updates.timeframe = timeframe;
      if (session !== undefined) updates.session = session;
      if (strategy !== undefined) updates.strategy = strategy;
      if (notes !== undefined) updates.notes = notes;
      if (pre_trade_plan !== undefined) updates.pre_trade_plan = pre_trade_plan;
      if (post_trade_review !== undefined) updates.post_trade_review = post_trade_review;
      if (screenshot_url !== undefined) updates.screenshot_url = screenshot_url;
      if (status !== undefined) {
        if (!['open', 'closed', 'cancelled'].includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }
        updates.status = status;
      }
      if (commission !== undefined) updates.commission = parseFloat(commission) || 0;
      if (swap_fees !== undefined) updates.swap_fees = parseFloat(swap_fees) || 0;

      // Recalculate derived fields
      const finalEntry = updates.entry_price ?? existingTrade.entry_price;
      const finalExit = updates.exit_price ?? existingTrade.exit_price;
      const finalQuantity = updates.quantity ?? existingTrade.quantity;
      const finalDirection = updates.direction ?? existingTrade.direction;
      const finalStopLoss = updates.stop_loss ?? existingTrade.stop_loss;
      const finalCommission = updates.commission ?? existingTrade.commission;
      const finalSwapFees = updates.swap_fees ?? existingTrade.swap_fees;
      const finalEntryDate = updates.entry_date ?? existingTrade.entry_date;
      const finalExitDate = updates.exit_date ?? existingTrade.exit_date;

      // Calculate initial risk
      if (finalStopLoss) {
        const riskPerShare = Math.abs(finalEntry - finalStopLoss);
        updates.initial_risk_amount = riskPerShare * finalQuantity;
      }

      // If we have exit, calculate P&L
      if (finalExit && finalExitDate) {
        updates.status = 'closed';

        const priceChange = finalDirection === 'long'
          ? finalExit - finalEntry
          : finalEntry - finalExit;

        updates.pnl_amount = (priceChange * finalQuantity) - finalCommission - finalSwapFees;
        updates.pnl_percent = finalEntry > 0 ? (priceChange / finalEntry) * 100 : 0;

        // Calculate R-multiple
        const initialRisk = updates.initial_risk_amount ?? existingTrade.initial_risk_amount;
        if (initialRisk && initialRisk > 0) {
          updates.r_multiple = updates.pnl_amount / initialRisk;
        }

        // Calculate holding time
        const entryTime = new Date(finalEntryDate);
        const exitTime = new Date(finalExitDate);
        updates.holding_time_minutes = Math.round((exitTime - entryTime) / (1000 * 60));
      } else if (finalExit === null || finalExitDate === null) {
        // Trade reopened
        updates.status = 'open';
        updates.pnl_amount = null;
        updates.pnl_percent = null;
        updates.r_multiple = null;
        updates.holding_time_minutes = null;
      }

      // Update trade
      const { data: updatedTrade, error: updateError } = await supabase
        .from('journal_trades')
        .update(updates)
        .eq('id', id)
        .eq('journal_user_id', user.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Error updating trade:', updateError);
        return res.status(500).json({ error: 'Failed to update trade' });
      }

      // Update tags if provided
      if (tag_ids !== undefined) {
        // Delete existing tags
        await supabase
          .from('journal_trade_tags')
          .delete()
          .eq('trade_id', id);

        // Insert new tags
        if (tag_ids.length > 0) {
          const tagInserts = tag_ids.map(tagId => ({
            trade_id: id,
            tag_id: tagId,
          }));

          const { error: tagError } = await supabase
            .from('journal_trade_tags')
            .insert(tagInserts);

          if (tagError) {
            logger.error('Error updating trade tags:', tagError);
          }
        }
      }

      return res.status(200).json(updatedTrade);
    }

    if (req.method === 'DELETE') {
      const { error: deleteError } = await supabase
        .from('journal_trades')
        .delete()
        .eq('id', id)
        .eq('journal_user_id', user.id);

      if (deleteError) {
        logger.error('Error deleting trade:', deleteError);
        return res.status(500).json({ error: 'Failed to delete trade' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    logger.error('Journal trade API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
