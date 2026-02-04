import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import JournalLayout from '../../components/journal/JournalLayout';
import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';

export default function ImportPage({ user, settings }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('generic');
  const [csvData, setCsvData] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Map, 3: Result

  const formats = [
    { value: 'generic', label: 'Generic CSV', description: 'Auto-detect columns or map manually' },
    { value: 'tradingview', label: 'TradingView', description: 'Export from TradingView trade history' },
    { value: 'mt4', label: 'MT4/MT5', description: 'MetaTrader statement export' },
    { value: 'thinkorswim', label: 'ThinkOrSwim', description: 'TOS activity export' },
  ];

  const requiredFields = ['symbol', 'entry_price'];
  const optionalFields = ['direction', 'exit_price', 'entry_date', 'exit_date', 'quantity', 'pnl', 'stop_loss', 'take_profit'];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        setError('CSV file must have at least a header row and one data row');
        return;
      }

      // Parse header
      const delimiter = detectDelimiter(lines[0]);
      const headers = parseCSVLine(lines[0], delimiter);

      // Parse data rows
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], delimiter);
        if (values.length === headers.length) {
          const row = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx]?.trim();
          });
          rows.push(row);
        }
      }

      setCsvData({ headers, rows });
      setPreviewRows(rows.slice(0, 5));

      // Auto-detect column mapping
      const autoMapping = autoDetectColumns(headers);
      setColumnMapping(autoMapping);

      setStep(2);
    } catch (err) {
      setError('Failed to parse CSV file: ' + err.message);
    }
  };

  const detectDelimiter = (line) => {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let bestDelimiter = ',';

    for (const d of delimiters) {
      const count = (line.match(new RegExp(`\\${d}`, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = d;
      }
    }

    return bestDelimiter;
  };

  const parseCSVLine = (line, delimiter) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result.map(v => v.replace(/^"|"$/g, '').trim());
  };

  const autoDetectColumns = (headers) => {
    const mapping = {};
    const patterns = {
      symbol: /^(symbol|ticker|instrument|pair|item|underlying)$/i,
      direction: /^(direction|side|type|action|order.?type)$/i,
      entry_price: /^(entry.?price|open.?price|buy.?price|price|fill.?price)$/i,
      exit_price: /^(exit.?price|close.?price|sell.?price)$/i,
      entry_date: /^(entry.?date|open.?date|date.?opened|entry.?time|open.?time|exec.?time|date.?time)$/i,
      exit_date: /^(exit.?date|close.?date|date.?closed|exit.?time|close.?time)$/i,
      quantity: /^(quantity|qty|size|volume|lots|shares|contracts)$/i,
      pnl: /^(pnl|profit|p.?l|gain.?loss|result|net.?p.?l)$/i,
      stop_loss: /^(stop.?loss|sl|stop)$/i,
      take_profit: /^(take.?profit|tp|target)$/i,
    };

    for (const header of headers) {
      for (const [field, pattern] of Object.entries(patterns)) {
        if (pattern.test(header) && !mapping[field]) {
          mapping[field] = header;
          break;
        }
      }
    }

    return mapping;
  };

  const handleImport = async () => {
    if (!csvData || csvData.rows.length === 0) {
      setError('No data to import');
      return;
    }

    // Validate required fields are mapped
    const missingRequired = requiredFields.filter(f => !columnMapping[f]);
    if (missingRequired.length > 0) {
      setError(`Please map required fields: ${missingRequired.join(', ')}`);
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const res = await fetch('/api/journal/import-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: csvData.rows,
          format,
          columnMapping: format === 'generic' ? columnMapping : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Import failed');
      }

      setResult(data);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setCsvData(null);
    setPreviewRows([]);
    setColumnMapping({});
    setResult(null);
    setError(null);
    setStep(1);
  };

  return (
    <JournalLayout user={user} title="Import Trades" settings={settings}>
      <style jsx>{`
        .header {
          margin-bottom: 32px;
        }
        h1 {
          color: white;
          font-size: 1.8rem;
          margin-bottom: 8px;
        }
        .subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }
        .steps {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.5);
        }
        .step.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          color: #667eea;
          border: 1px solid rgba(102, 126, 234, 0.3);
        }
        .step.completed {
          color: #10b981;
        }
        .step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .step.active .step-number {
          background: #667eea;
          color: white;
        }
        .step.completed .step-number {
          background: #10b981;
          color: white;
        }
        .section {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 32px;
          margin-bottom: 24px;
        }
        .section-title {
          color: white;
          font-size: 1.1rem;
          margin-bottom: 20px;
        }
        .format-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .format-card {
          padding: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .format-card:hover {
          border-color: rgba(102, 126, 234, 0.3);
        }
        .format-card.selected {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }
        .format-name {
          color: white;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .format-desc {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8rem;
        }
        .dropzone {
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dropzone:hover {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.05);
        }
        .dropzone-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }
        .dropzone-text {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 8px;
        }
        .dropzone-hint {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.85rem;
        }
        .file-input {
          display: none;
        }
        .selected-file {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 8px;
          margin-top: 16px;
        }
        .file-icon {
          font-size: 1.5rem;
        }
        .file-name {
          color: white;
          font-weight: 500;
        }
        .file-size {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
        }
        .mapping-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .mapping-item {
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }
        .mapping-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .required {
          color: #ef4444;
        }
        .mapping-select {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: white;
          font-size: 0.9rem;
        }
        .preview-table {
          width: 100%;
          overflow-x: auto;
          margin-bottom: 24px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        th, td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        th {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
          text-transform: uppercase;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.03);
        }
        td {
          color: rgba(255, 255, 255, 0.8);
        }
        .btn-group {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.7);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .error-box {
          padding: 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          margin-bottom: 24px;
        }
        .success-box {
          text-align: center;
          padding: 40px;
        }
        .success-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        .success-title {
          color: #10b981;
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .success-message {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 24px;
        }
      `}</style>

      <div className="header">
        <h1>Import Trades</h1>
        <p className="subtitle">Import your trading history from CSV files</p>
      </div>

      {/* Progress Steps */}
      <div className="steps">
        <div className={`step ${step >= 1 ? (step === 1 ? 'active' : 'completed') : ''}`}>
          <div className="step-number">{step > 1 ? '✓' : '1'}</div>
          <span>Upload CSV</span>
        </div>
        <div className={`step ${step >= 2 ? (step === 2 ? 'active' : 'completed') : ''}`}>
          <div className="step-number">{step > 2 ? '✓' : '2'}</div>
          <span>Map Columns</span>
        </div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span>Import</span>
        </div>
      </div>

      {error && (
        <div className="error-box">{error}</div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="section">
          <div className="section-title">Choose Format</div>
          <div className="format-grid">
            {formats.map((f) => (
              <div
                key={f.value}
                className={`format-card ${format === f.value ? 'selected' : ''}`}
                onClick={() => setFormat(f.value)}
              >
                <div className="format-name">{f.label}</div>
                <div className="format-desc">{f.description}</div>
              </div>
            ))}
          </div>

          <div className="section-title">Upload File</div>
          <label className="dropzone">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="file-input"
            />
            <div className="dropzone-icon">📄</div>
            <div className="dropzone-text">Click to upload or drag and drop</div>
            <div className="dropzone-hint">CSV files only, max 5MB</div>
          </label>

          {file && (
            <div className="selected-file">
              <span className="file-icon">📄</span>
              <div>
                <div className="file-name">{file.name}</div>
                <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview & Map */}
      {step === 2 && csvData && (
        <>
          <div className="section">
            <div className="section-title">Column Mapping</div>
            <div className="mapping-grid">
              {[...requiredFields, ...optionalFields].map((field) => (
                <div key={field} className="mapping-item">
                  <label className="mapping-label">
                    {field.replace(/_/g, ' ')}
                    {requiredFields.includes(field) && <span className="required">*</span>}
                  </label>
                  <select
                    className="mapping-select"
                    value={columnMapping[field] || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                  >
                    <option value="">-- Not Mapped --</option>
                    {csvData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="section-title">Preview ({previewRows.length} of {csvData.rows.length} rows)</div>
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    {csvData.headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {csvData.headers.map((h) => (
                        <td key={h}>{row[h] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="btn-group">
              <button className="btn btn-secondary" onClick={reset}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? 'Importing...' : `Import ${csvData.rows.length} Trades`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Step 3: Result */}
      {step === 3 && result && (
        <div className="section">
          <div className="success-box">
            <div className="success-icon">✅</div>
            <div className="success-title">Import Complete!</div>
            <div className="success-message">
              Successfully imported {result.imported} trades into your journal.
            </div>
            <div className="btn-group" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={reset}>
                Import More
              </button>
              <button
                className="btn btn-primary"
                onClick={() => router.push('/trading-journal/trades')}
              >
                View Trade Log
              </button>
            </div>
          </div>
        </div>
      )}
    </JournalLayout>
  );
}

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
    console.error('Import page error:', err);
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}
