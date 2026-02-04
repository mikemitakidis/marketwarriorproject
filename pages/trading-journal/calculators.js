import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState } from 'react';

export async function getServerSideProps({ req, res }) {
  try {
    const user = await getJournalUser(req, res);
    if (!user) {
      return { redirect: { destination: '/trading-journal/login', permanent: false } };
    }

    const access = await checkJournalAccess(user);
    if (!access.hasAccess && access.requiresPayment) {
      return { redirect: { destination: '/trading-journal/upgrade', permanent: false } };
    }

    const supabase = getServiceSupabase();
    const { data: settings } = await supabase
      .from('journal_settings')
      .select('*')
      .eq('journal_user_id', user.id)
      .maybeSingle();

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || null,
        },
        settings: settings || null,
      },
    };
  } catch (err) {
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}

// Position Size Calculator
function PositionSizeCalculator() {
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    if (!entry || !stop || entry === stop) return;

    const riskAmount = accountSize * (riskPercent / 100);
    const riskPerShare = Math.abs(entry - stop);
    const positionSize = Math.floor(riskAmount / riskPerShare);
    const totalValue = positionSize * entry;

    setResult({ riskAmount, riskPerShare, positionSize, totalValue });
  };

  return (
    <div className="calculator-card">
      <h3>Position Size Calculator</h3>
      <p className="calc-desc">Calculate your exact position size based on risk</p>
      <div className="calc-inputs">
        <div className="calc-input">
          <label>Account Size ($)</label>
          <input type="number" value={accountSize} onChange={(e) => setAccountSize(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="calc-input">
          <label>Risk Per Trade (%)</label>
          <input type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="calc-input">
          <label>Entry Price ($)</label>
          <input type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="150.00" />
        </div>
        <div className="calc-input">
          <label>Stop Loss Price ($)</label>
          <input type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="148.00" />
        </div>
      </div>
      <button className="calc-btn" onClick={calculate}>Calculate Position Size</button>
      {result && (
        <div className="calc-results">
          <div className="calc-result"><span>Risk Amount:</span><strong>${result.riskAmount.toFixed(2)}</strong></div>
          <div className="calc-result"><span>Risk Per Share:</span><strong>${result.riskPerShare.toFixed(2)}</strong></div>
          <div className="calc-result highlight"><span>Position Size:</span><strong>{result.positionSize} shares</strong></div>
          <div className="calc-result"><span>Total Value:</span><strong>${result.totalValue.toFixed(2)}</strong></div>
        </div>
      )}
    </div>
  );
}

// Risk-Reward Calculator
function RiskRewardCalculator() {
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const target = parseFloat(takeProfit);
    if (!entry || !stop || !target) return;

    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    const ratio = reward / risk;
    const breakEvenWinRate = (1 / (1 + ratio)) * 100;

    setResult({ risk, reward, ratio, breakEvenWinRate });
  };

  return (
    <div className="calculator-card">
      <h3>Risk-Reward Calculator</h3>
      <p className="calc-desc">Calculate your risk-to-reward ratio</p>
      <div className="calc-inputs">
        <div className="calc-input">
          <label>Entry Price ($)</label>
          <input type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="150.00" />
        </div>
        <div className="calc-input">
          <label>Stop Loss ($)</label>
          <input type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="148.00" />
        </div>
        <div className="calc-input">
          <label>Take Profit ($)</label>
          <input type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="156.00" />
        </div>
      </div>
      <button className="calc-btn" onClick={calculate}>Calculate R:R</button>
      {result && (
        <div className="calc-results">
          <div className="calc-result"><span>Risk:</span><strong>${result.risk.toFixed(2)}</strong></div>
          <div className="calc-result"><span>Reward:</span><strong>${result.reward.toFixed(2)}</strong></div>
          <div className="calc-result highlight"><span>Risk:Reward Ratio:</span><strong>1:{result.ratio.toFixed(2)}</strong></div>
          <div className="calc-result"><span>Break-Even Win Rate:</span><strong>{result.breakEvenWinRate.toFixed(1)}%</strong></div>
        </div>
      )}
    </div>
  );
}

// Fibonacci Calculator
function FibonacciCalculator() {
  const [trend, setTrend] = useState('uptrend');
  const [startPrice, setStartPrice] = useState('');
  const [endPrice, setEndPrice] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const start = parseFloat(startPrice);
    const end = parseFloat(endPrice);
    if (!start || !end) return;

    const diff = Math.abs(end - start);
    const levels = trend === 'uptrend'
      ? {
          '0.0%': end,
          '23.6%': end - (diff * 0.236),
          '38.2%': end - (diff * 0.382),
          '50.0%': end - (diff * 0.5),
          '61.8%': end - (diff * 0.618),
          '78.6%': end - (diff * 0.786),
          '100.0%': start,
        }
      : {
          '0.0%': end,
          '23.6%': end + (diff * 0.236),
          '38.2%': end + (diff * 0.382),
          '50.0%': end + (diff * 0.5),
          '61.8%': end + (diff * 0.618),
          '78.6%': end + (diff * 0.786),
          '100.0%': start,
        };

    setResult(levels);
  };

  return (
    <div className="calculator-card">
      <h3>Fibonacci Retracement</h3>
      <p className="calc-desc">Calculate Fibonacci retracement levels</p>
      <div className="calc-inputs">
        <div className="calc-input">
          <label>Trend Direction</label>
          <select value={trend} onChange={(e) => setTrend(e.target.value)}>
            <option value="uptrend">Uptrend (Low to High)</option>
            <option value="downtrend">Downtrend (High to Low)</option>
          </select>
        </div>
        <div className="calc-input">
          <label>Starting Point Price</label>
          <input type="number" step="any" value={startPrice} onChange={(e) => setStartPrice(e.target.value)} placeholder="140.00" />
        </div>
        <div className="calc-input">
          <label>Ending Point Price</label>
          <input type="number" step="any" value={endPrice} onChange={(e) => setEndPrice(e.target.value)} placeholder="180.00" />
        </div>
      </div>
      <button className="calc-btn" onClick={calculate}>Calculate Fibonacci Levels</button>
      {result && (
        <div className="calc-results">
          {Object.entries(result).map(([level, price]) => (
            <div key={level} className={`calc-result ${level === '61.8%' || level === '38.2%' ? 'highlight' : ''}`}>
              <span>{level}</span>
              <strong>${price.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// RSI Calculator
function RSICalculator() {
  const [prices, setPrices] = useState('');
  const [period, setPeriod] = useState(14);
  const [result, setResult] = useState(null);

  const calculate = () => {
    const priceArray = prices.split(',').map((p) => parseFloat(p.trim())).filter((p) => !isNaN(p));
    if (priceArray.length < period + 1) {
      setResult({ error: `Need at least ${period + 1} prices` });
      return;
    }

    // Calculate price changes
    const changes = [];
    for (let i = 1; i < priceArray.length; i++) {
      changes.push(priceArray[i] - priceArray[i - 1]);
    }

    // Calculate average gains and losses
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) avgGain += changes[i];
      else avgLoss += Math.abs(changes[i]);
    }
    avgGain /= period;
    avgLoss /= period;

    // Calculate RSI
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    let interpretation = 'Neutral';
    if (rsi >= 70) interpretation = 'Overbought - Potential Sell Signal';
    else if (rsi <= 30) interpretation = 'Oversold - Potential Buy Signal';

    setResult({ rsi, avgGain, avgLoss, rs, interpretation });
  };

  return (
    <div className="calculator-card">
      <h3>RSI Calculator</h3>
      <p className="calc-desc">Calculate Relative Strength Index</p>
      <div className="calc-inputs">
        <div className="calc-input full">
          <label>Closing Prices (comma-separated)</label>
          <textarea
            value={prices}
            onChange={(e) => setPrices(e.target.value)}
            placeholder="44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28"
            rows={3}
          />
        </div>
        <div className="calc-input">
          <label>Period</label>
          <input type="number" value={period} onChange={(e) => setPeriod(parseInt(e.target.value) || 14)} />
        </div>
      </div>
      <button className="calc-btn" onClick={calculate}>Calculate RSI</button>
      {result && !result.error && (
        <div className="calc-results">
          <div className="calc-result highlight"><span>RSI Value:</span><strong>{result.rsi.toFixed(2)}</strong></div>
          <div className="calc-result"><span>Avg Gain:</span><strong>{result.avgGain.toFixed(4)}</strong></div>
          <div className="calc-result"><span>Avg Loss:</span><strong>{result.avgLoss.toFixed(4)}</strong></div>
          <div className="calc-result"><span>RS:</span><strong>{result.rs.toFixed(4)}</strong></div>
          <div className="calc-result" style={{ gridColumn: '1 / -1' }}>
            <span>Interpretation:</span>
            <strong style={{ color: result.rsi >= 70 ? '#f87171' : result.rsi <= 30 ? '#4ade80' : 'inherit' }}>
              {result.interpretation}
            </strong>
          </div>
        </div>
      )}
      {result?.error && <div className="calc-error">{result.error}</div>}
    </div>
  );
}

// Moving Average Calculator
function MovingAverageCalculator() {
  const [prices, setPrices] = useState('');
  const [period, setPeriod] = useState(20);
  const [maType, setMaType] = useState('sma');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const priceArray = prices.split(',').map((p) => parseFloat(p.trim())).filter((p) => !isNaN(p));
    if (priceArray.length < period) {
      setResult({ error: `Need at least ${period} prices for a ${period}-period MA` });
      return;
    }

    if (maType === 'sma') {
      // Simple Moving Average
      const smaValues = [];
      for (let i = period - 1; i < priceArray.length; i++) {
        const sum = priceArray.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        smaValues.push(sum / period);
      }
      const currentSMA = smaValues[smaValues.length - 1];
      const previousSMA = smaValues.length > 1 ? smaValues[smaValues.length - 2] : currentSMA;
      const trend = currentSMA > previousSMA ? 'Uptrend' : currentSMA < previousSMA ? 'Downtrend' : 'Flat';
      const currentPrice = priceArray[priceArray.length - 1];
      const position = currentPrice > currentSMA ? 'Above MA (Bullish)' : currentPrice < currentSMA ? 'Below MA (Bearish)' : 'At MA';

      setResult({ type: 'SMA', period, value: currentSMA, trend, position, currentPrice });
    } else {
      // Exponential Moving Average
      const multiplier = 2 / (period + 1);
      let ema = priceArray.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const emaValues = [ema];

      for (let i = period; i < priceArray.length; i++) {
        ema = (priceArray[i] - ema) * multiplier + ema;
        emaValues.push(ema);
      }

      const currentEMA = emaValues[emaValues.length - 1];
      const previousEMA = emaValues.length > 1 ? emaValues[emaValues.length - 2] : currentEMA;
      const trend = currentEMA > previousEMA ? 'Uptrend' : currentEMA < previousEMA ? 'Downtrend' : 'Flat';
      const currentPrice = priceArray[priceArray.length - 1];
      const position = currentPrice > currentEMA ? 'Above MA (Bullish)' : currentPrice < currentEMA ? 'Below MA (Bearish)' : 'At MA';

      setResult({ type: 'EMA', period, value: currentEMA, trend, position, currentPrice });
    }
  };

  return (
    <div className="calculator-card">
      <h3>Moving Average Calculator</h3>
      <p className="calc-desc">Calculate SMA or EMA from price data</p>
      <div className="calc-inputs">
        <div className="calc-input full">
          <label>Closing Prices (comma-separated, oldest to newest)</label>
          <textarea
            value={prices}
            onChange={(e) => setPrices(e.target.value)}
            placeholder="100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113, 115, 117, 116, 118, 120"
            rows={3}
          />
        </div>
        <div className="calc-input">
          <label>MA Type</label>
          <select value={maType} onChange={(e) => setMaType(e.target.value)}>
            <option value="sma">Simple (SMA)</option>
            <option value="ema">Exponential (EMA)</option>
          </select>
        </div>
        <div className="calc-input">
          <label>Period</label>
          <input type="number" value={period} onChange={(e) => setPeriod(parseInt(e.target.value) || 20)} />
        </div>
      </div>
      <button className="calc-btn" onClick={calculate}>Calculate Moving Average</button>
      {result && !result.error && (
        <div className="calc-results">
          <div className="calc-result highlight">
            <span>{result.type} ({result.period}):</span>
            <strong>${result.value.toFixed(2)}</strong>
          </div>
          <div className="calc-result">
            <span>Current Price:</span>
            <strong>${result.currentPrice.toFixed(2)}</strong>
          </div>
          <div className="calc-result">
            <span>Trend:</span>
            <strong style={{ color: result.trend === 'Uptrend' ? '#4ade80' : result.trend === 'Downtrend' ? '#f87171' : 'inherit' }}>
              {result.trend}
            </strong>
          </div>
          <div className="calc-result">
            <span>Price Position:</span>
            <strong style={{ color: result.position.includes('Bullish') ? '#4ade80' : result.position.includes('Bearish') ? '#f87171' : 'inherit' }}>
              {result.position}
            </strong>
          </div>
        </div>
      )}
      {result?.error && <div className="calc-error">{result.error}</div>}
    </div>
  );
}

// Support & Resistance Calculator
function SupportResistanceCalculator() {
  const [highPrice, setHighPrice] = useState('');
  const [lowPrice, setLowPrice] = useState('');
  const [closePrice, setClosePrice] = useState('');
  const [method, setMethod] = useState('pivot');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const high = parseFloat(highPrice);
    const low = parseFloat(lowPrice);
    const close = parseFloat(closePrice);

    if (!high || !low || !close) {
      setResult({ error: 'Please enter all price values' });
      return;
    }

    if (method === 'pivot') {
      // Standard Pivot Points
      const pivot = (high + low + close) / 3;
      const r1 = (2 * pivot) - low;
      const r2 = pivot + (high - low);
      const r3 = high + 2 * (pivot - low);
      const s1 = (2 * pivot) - high;
      const s2 = pivot - (high - low);
      const s3 = low - 2 * (high - pivot);

      setResult({
        method: 'Standard Pivot Points',
        levels: [
          { label: 'R3 (Resistance 3)', value: r3, type: 'resistance' },
          { label: 'R2 (Resistance 2)', value: r2, type: 'resistance' },
          { label: 'R1 (Resistance 1)', value: r1, type: 'resistance' },
          { label: 'Pivot Point', value: pivot, type: 'pivot' },
          { label: 'S1 (Support 1)', value: s1, type: 'support' },
          { label: 'S2 (Support 2)', value: s2, type: 'support' },
          { label: 'S3 (Support 3)', value: s3, type: 'support' },
        ],
      });
    } else if (method === 'fibonacci') {
      // Fibonacci Pivot Points
      const pivot = (high + low + close) / 3;
      const range = high - low;
      const r1 = pivot + (0.382 * range);
      const r2 = pivot + (0.618 * range);
      const r3 = pivot + (1.0 * range);
      const s1 = pivot - (0.382 * range);
      const s2 = pivot - (0.618 * range);
      const s3 = pivot - (1.0 * range);

      setResult({
        method: 'Fibonacci Pivot Points',
        levels: [
          { label: 'R3 (100%)', value: r3, type: 'resistance' },
          { label: 'R2 (61.8%)', value: r2, type: 'resistance' },
          { label: 'R1 (38.2%)', value: r1, type: 'resistance' },
          { label: 'Pivot Point', value: pivot, type: 'pivot' },
          { label: 'S1 (38.2%)', value: s1, type: 'support' },
          { label: 'S2 (61.8%)', value: s2, type: 'support' },
          { label: 'S3 (100%)', value: s3, type: 'support' },
        ],
      });
    } else if (method === 'camarilla') {
      // Camarilla Pivot Points
      const range = high - low;
      const r4 = close + (range * 1.1 / 2);
      const r3 = close + (range * 1.1 / 4);
      const r2 = close + (range * 1.1 / 6);
      const r1 = close + (range * 1.1 / 12);
      const s1 = close - (range * 1.1 / 12);
      const s2 = close - (range * 1.1 / 6);
      const s3 = close - (range * 1.1 / 4);
      const s4 = close - (range * 1.1 / 2);

      setResult({
        method: 'Camarilla Pivot Points',
        levels: [
          { label: 'R4 (Breakout)', value: r4, type: 'resistance' },
          { label: 'R3 (Key Resistance)', value: r3, type: 'resistance' },
          { label: 'R2', value: r2, type: 'resistance' },
          { label: 'R1', value: r1, type: 'resistance' },
          { label: 'S1', value: s1, type: 'support' },
          { label: 'S2', value: s2, type: 'support' },
          { label: 'S3 (Key Support)', value: s3, type: 'support' },
          { label: 'S4 (Breakdown)', value: s4, type: 'support' },
        ],
      });
    }
  };

  return (
    <div className="calculator-card">
      <h3>Support & Resistance Calculator</h3>
      <p className="calc-desc">Calculate pivot points and key S/R levels</p>
      <div className="calc-inputs">
        <div className="calc-input">
          <label>Previous High ($)</label>
          <input type="number" step="any" value={highPrice} onChange={(e) => setHighPrice(e.target.value)} placeholder="155.00" />
        </div>
        <div className="calc-input">
          <label>Previous Low ($)</label>
          <input type="number" step="any" value={lowPrice} onChange={(e) => setLowPrice(e.target.value)} placeholder="148.00" />
        </div>
        <div className="calc-input">
          <label>Previous Close ($)</label>
          <input type="number" step="any" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} placeholder="152.00" />
        </div>
        <div className="calc-input">
          <label>Calculation Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="pivot">Standard Pivot Points</option>
            <option value="fibonacci">Fibonacci Pivot Points</option>
            <option value="camarilla">Camarilla Pivot Points</option>
          </select>
        </div>
      </div>
      <button className="calc-btn" onClick={calculate}>Calculate S/R Levels</button>
      {result && !result.error && (
        <div className="calc-results" style={{ gridTemplateColumns: '1fr' }}>
          <div style={{ marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
            {result.method}
          </div>
          {result.levels.map((level, idx) => (
            <div
              key={idx}
              className={`calc-result ${level.type === 'pivot' ? 'highlight' : ''}`}
              style={{
                borderLeft: level.type === 'resistance' ? '3px solid #f87171' :
                           level.type === 'support' ? '3px solid #4ade80' : '3px solid #667eea'
              }}
            >
              <span>{level.label}</span>
              <strong style={{
                color: level.type === 'resistance' ? '#f87171' :
                       level.type === 'support' ? '#4ade80' : '#667eea'
              }}>
                ${level.value.toFixed(2)}
              </strong>
            </div>
          ))}
        </div>
      )}
      {result?.error && <div className="calc-error">{result.error}</div>}
    </div>
  );
}

// ROI Calculator
function ROICalculator() {
  const [initialInvestment, setInitialInvestment] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const initial = parseFloat(initialInvestment);
    const final = parseFloat(finalValue);
    if (!initial || !final) return;

    const gain = final - initial;
    const roi = ((final - initial) / initial) * 100;

    setResult({ gain, roi });
  };

  return (
    <div className="calculator-card">
      <h3>ROI Calculator</h3>
      <p className="calc-desc">Calculate Return on Investment</p>
      <div className="calc-inputs">
        <div className="calc-input">
          <label>Initial Investment ($)</label>
          <input type="number" step="any" value={initialInvestment} onChange={(e) => setInitialInvestment(e.target.value)} placeholder="10000" />
        </div>
        <div className="calc-input">
          <label>Final Value ($)</label>
          <input type="number" step="any" value={finalValue} onChange={(e) => setFinalValue(e.target.value)} placeholder="12500" />
        </div>
      </div>
      <button className="calc-btn" onClick={calculate}>Calculate ROI</button>
      {result && (
        <div className="calc-results">
          <div className="calc-result">
            <span>Gain/Loss:</span>
            <strong style={{ color: result.gain >= 0 ? '#4ade80' : '#f87171' }}>
              {result.gain >= 0 ? '+' : ''}${result.gain.toFixed(2)}
            </strong>
          </div>
          <div className="calc-result highlight">
            <span>ROI:</span>
            <strong style={{ color: result.roi >= 0 ? '#4ade80' : '#f87171' }}>
              {result.roi >= 0 ? '+' : ''}{result.roi.toFixed(2)}%
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

// Leverage Impact Calculator
function LeverageCalculator() {
  const [capital, setCapital] = useState('');
  const [leverage, setLeverage] = useState('');
  const [marketMove, setMarketMove] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const cap = parseFloat(capital);
    const lev = parseFloat(leverage);
    const move = parseFloat(marketMove);
    if (!cap || !lev || move === undefined) return;

    const exposure = cap * lev;
    const leveragedMove = move * lev;
    const pnl = (cap * leveragedMove) / 100;

    setResult({ exposure, leveragedMove, pnl });
  };

  return (
    <div className="calculator-card">
      <h3>Leverage Impact Calculator</h3>
      <p className="calc-desc">See how leverage affects your returns</p>
      <div className="calc-inputs">
        <div className="calc-input">
          <label>Capital ($)</label>
          <input type="number" step="any" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="1000" />
        </div>
        <div className="calc-input">
          <label>Leverage (x)</label>
          <input type="number" step="any" value={leverage} onChange={(e) => setLeverage(e.target.value)} placeholder="10" />
        </div>
        <div className="calc-input">
          <label>Market Move (%)</label>
          <input type="number" step="any" value={marketMove} onChange={(e) => setMarketMove(e.target.value)} placeholder="2" />
        </div>
      </div>
      <button className="calc-btn" onClick={calculate}>Calculate Impact</button>
      {result && (
        <div className="calc-results">
          <div className="calc-result"><span>Total Exposure:</span><strong>${result.exposure.toLocaleString()}</strong></div>
          <div className="calc-result highlight">
            <span>Leveraged Move:</span>
            <strong style={{ color: result.leveragedMove >= 0 ? '#4ade80' : '#f87171' }}>
              {result.leveragedMove >= 0 ? '+' : ''}{result.leveragedMove.toFixed(2)}%
            </strong>
          </div>
          <div className="calc-result">
            <span>P&L:</span>
            <strong style={{ color: result.pnl >= 0 ? '#4ade80' : '#f87171' }}>
              {result.pnl >= 0 ? '+' : ''}${result.pnl.toFixed(2)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

// PE Ratio Calculator
function PERatioCalculator() {
  const [stockPrice, setStockPrice] = useState('');
  const [eps, setEps] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const price = parseFloat(stockPrice);
    const earnings = parseFloat(eps);
    if (!price || !earnings) return;

    const peRatio = price / earnings;

    let interpretation = 'Average valuation';
    if (peRatio < 15) interpretation = 'Potentially undervalued';
    else if (peRatio > 25) interpretation = 'Potentially overvalued';

    setResult({ peRatio, interpretation });
  };

  return (
    <div className="calculator-card">
      <h3>P/E Ratio Calculator</h3>
      <p className="calc-desc">Calculate Price-to-Earnings ratio</p>
      <div className="calc-inputs">
        <div className="calc-input">
          <label>Stock Price ($)</label>
          <input type="number" step="any" value={stockPrice} onChange={(e) => setStockPrice(e.target.value)} placeholder="150.00" />
        </div>
        <div className="calc-input">
          <label>Earnings Per Share ($)</label>
          <input type="number" step="any" value={eps} onChange={(e) => setEps(e.target.value)} placeholder="6.50" />
        </div>
      </div>
      <button className="calc-btn" onClick={calculate}>Calculate P/E</button>
      {result && (
        <div className="calc-results">
          <div className="calc-result highlight"><span>P/E Ratio:</span><strong>{result.peRatio.toFixed(2)}</strong></div>
          <div className="calc-result"><span>Interpretation:</span><strong>{result.interpretation}</strong></div>
        </div>
      )}
    </div>
  );
}

export default function CalculatorsPage({ user, settings }) {
  const [activeTab, setActiveTab] = useState('trading');

  const tabs = [
    { id: 'trading', label: 'Pre-Trade', icon: '📊' },
    { id: 'technical', label: 'Technical', icon: '📈' },
    { id: 'fundamental', label: 'Fundamental', icon: '📋' },
  ];

  return (
    <JournalLayout user={user} title="Calculators" settings={settings}>
      <style jsx global>{`
        .calculator-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
        }
        .calculator-card h3 {
          color: white;
          font-size: 1.2rem;
          margin-bottom: 8px;
        }
        .calc-desc {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          margin-bottom: 20px;
        }
        .calc-inputs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .calc-input {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .calc-input.full {
          grid-column: 1 / -1;
        }
        .calc-input label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .calc-input input, .calc-input select, .calc-input textarea {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          font-size: 0.9rem;
        }
        .calc-input input:focus, .calc-input select:focus, .calc-input textarea:focus {
          outline: none;
          border-color: #667eea;
        }
        .calc-input select option {
          background: #1e293b;
        }
        .calc-input textarea {
          resize: vertical;
          font-family: monospace;
        }
        .calc-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .calc-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .calc-results {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .calc-result {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }
        .calc-result span {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
        }
        .calc-result strong {
          color: white;
          font-size: 1rem;
        }
        .calc-result.highlight {
          background: rgba(102, 126, 234, 0.15);
          border: 1px solid rgba(102, 126, 234, 0.3);
        }
        .calc-result.highlight strong {
          color: #667eea;
        }
        .calc-error {
          color: #f87171;
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          margin-top: 16px;
        }
      `}</style>

      <style jsx>{`
        .page-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          width: fit-content;
        }
        .tab-btn {
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tab-btn:hover {
          color: white;
        }
        .tab-btn.active {
          background: #667eea;
          color: white;
        }
        .calculators-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }
        @media (max-width: 768px) {
          .calculators-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Calculator Hub</h1>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="calculators-grid">
        {activeTab === 'trading' && (
          <>
            <PositionSizeCalculator />
            <RiskRewardCalculator />
            <LeverageCalculator />
          </>
        )}

        {activeTab === 'technical' && (
          <>
            <MovingAverageCalculator />
            <SupportResistanceCalculator />
            <FibonacciCalculator />
            <RSICalculator />
          </>
        )}

        {activeTab === 'fundamental' && (
          <>
            <ROICalculator />
            <PERatioCalculator />
          </>
        )}
      </div>
    </JournalLayout>
  );
}
