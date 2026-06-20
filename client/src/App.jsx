import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Banknote, BarChart3, CheckCircle2, Clock3, Database, Home, Loader2, MapPin, ShieldCheck, Sparkles } from 'lucide-react';

const initialForm = {
  address: '742 Magnolia Ave, Tampa, FL',
  propertyType: 'Single-family rental',
  purchasePrice: 365000,
  estimatedValue: 385000,
  downPayment: 73000,
  interestRate: 6.75,
  loanTermYears: 30,
  monthlyRent: 2850,
  monthlyExpenses: 920,
  repairCost: 18000,
  vacancyRate: 6,
  neighborhoodScore: 78,
  riskTolerance: 'Moderate',
  goal: 'Balanced cash flow and appreciation'
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const numericFields = new Set([
  'purchasePrice',
  'estimatedValue',
  'downPayment',
  'interestRate',
  'loanTermYears',
  'monthlyRent',
  'monthlyExpenses',
  'repairCost',
  'vacancyRate',
  'neighborhoodScore'
]);
const apiBases = ['', 'http://localhost:5001', 'http://localhost:5002', 'http://localhost:5003'];

async function apiRequest(path, options) {
  let lastError;

  for (const baseUrl of apiBases) {
    try {
      const response = await fetch(`${baseUrl}${path}`, options);

      if (response.status === 400) {
        const details = await response.json();
        throw new Error(details.errors?.join(' ') || details.message || 'The request is invalid.');
      }

      if (response.ok) {
        return response.json();
      }

      if (response.status === 404) {
        throw new Error('Saved analysis was not found.');
      }
    } catch (requestError) {
      lastError = requestError;
      if (requestError.message !== 'Failed to fetch') {
        break;
      }
    }
  }

  throw lastError || new Error('The analysis service is unavailable.');
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Metric({ icon: Icon, label, value, tone = 'neutral' }) {
  return (
    <div className={`metric ${tone}`}>
      <Icon size={20} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [propertyHistory, setPropertyHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');

  const equityPercent = useMemo(() => {
    const price = Number(form.purchasePrice) || 1;
    return Math.round(((Number(form.downPayment) || 0) / price) * 100);
  }, [form.purchasePrice, form.downPayment]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: numericFields.has(name) ? Number(value) : value
    }));
  };

  const loadProperties = async () => {
    try {
      setHistoryError('');
      const data = await apiRequest('/api/properties');
      setProperties(data.properties || []);
    } catch (historyRequestError) {
      setHistoryError(historyRequestError.message);
    }
  };

  const loadPropertyHistory = async (propertyId) => {
    if (!propertyId) {
      setPropertyHistory([]);
      return;
    }

    setHistoryLoading(true);
    try {
      setHistoryError('');
      const data = await apiRequest(`/api/properties/${propertyId}/analysis-history`);
      setPropertyHistory(data.analyses || []);
    } catch (historyRequestError) {
      setHistoryError(historyRequestError.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadPropertyHistory(selectedPropertyId);
  }, [selectedPropertyId]);

  const analyze = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const analysis = await apiRequest('/api/analyze-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setResult(analysis);
      setSelectedPropertyId(String(analysis.propertyId || ''));
      await loadProperties();
    } catch (analysisError) {
      setError(analysisError.message);
    } finally {
      setLoading(false);
    }
  };

  const selectSavedAnalysis = async (analysisId) => {
    setHistoryLoading(true);
    try {
      setHistoryError('');
      const savedAnalysis = await apiRequest(`/api/analysis-history/${analysisId}`);
      setForm((current) => ({ ...current, ...savedAnalysis.inputSnapshot }));
      setResult(savedAnalysis);
    } catch (historyRequestError) {
      setHistoryError(historyRequestError.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={16} /> AI Property Decision Assistant</span>
          <h1>Decide if a property deserves your capital.</h1>
          <p>Compare cash flow, financing pressure, return quality, neighborhood strength, and risk in one fast underwriting pass.</p>
        </div>
        <div className="hero-panel" aria-label="Market snapshot">
          <div>
            <span>Target equity</span>
            <strong>{equityPercent}%</strong>
          </div>
          <div>
            <span>Monthly rent</span>
            <strong>{currency.format(form.monthlyRent)}</strong>
          </div>
          <div>
            <span>Risk profile</span>
            <strong>{form.riskTolerance}</strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <form className="underwriting-form" onSubmit={analyze}>
          <div className="section-heading">
            <Home size={22} />
            <div>
              <h2>Property Inputs</h2>
              <p>Adjust the deal assumptions and run an instant decision review.</p>
            </div>
          </div>

          <div className="form-grid">
            <Field label="Location">
              <input name="address" value={form.address} onChange={update} />
            </Field>
            <Field label="Property type">
              <select name="propertyType" value={form.propertyType} onChange={update}>
                <option>Single-family rental</option>
                <option>Duplex</option>
                <option>Small multifamily</option>
                <option>Short-term rental</option>
                <option>Fix and flip</option>
              </select>
            </Field>
            <Field label="Purchase price">
              <input name="purchasePrice" type="number" min="0" value={form.purchasePrice} onChange={update} />
            </Field>
            <Field label="Estimated value">
              <input name="estimatedValue" type="number" min="0" value={form.estimatedValue} onChange={update} />
            </Field>
            <Field label="Down payment">
              <input name="downPayment" type="number" min="0" value={form.downPayment} onChange={update} />
            </Field>
            <Field label="Loan rate (%)">
              <input name="interestRate" type="number" min="0" step="0.01" value={form.interestRate} onChange={update} />
            </Field>
            <Field label="Loan term">
              <select name="loanTermYears" value={form.loanTermYears} onChange={update}>
                <option value="15">15 years</option>
                <option value="20">20 years</option>
                <option value="30">30 years</option>
              </select>
            </Field>
            <Field label="Monthly rent">
              <input name="monthlyRent" type="number" min="0" value={form.monthlyRent} onChange={update} />
            </Field>
            <Field label="Monthly expenses">
              <input name="monthlyExpenses" type="number" min="0" value={form.monthlyExpenses} onChange={update} />
            </Field>
            <Field label="Repairs / upfront capex">
              <input name="repairCost" type="number" min="0" value={form.repairCost} onChange={update} />
            </Field>
            <Field label="Vacancy rate (%)">
              <input name="vacancyRate" type="number" min="0" max="100" step="0.1" value={form.vacancyRate} onChange={update} />
            </Field>
            <Field label="Risk tolerance">
              <select name="riskTolerance" value={form.riskTolerance} onChange={update}>
                <option>Conservative</option>
                <option>Moderate</option>
                <option>Aggressive</option>
              </select>
            </Field>
            <Field label={`Neighborhood strength: ${form.neighborhoodScore}`}>
              <input name="neighborhoodScore" type="range" min="0" max="100" value={form.neighborhoodScore} onChange={update} />
            </Field>
            <Field label="Investment goal">
              <select name="goal" value={form.goal} onChange={update}>
                <option>Maximum cash flow</option>
                <option>Balanced cash flow and appreciation</option>
                <option>Long-term appreciation</option>
                <option>Short-term resale profit</option>
              </select>
            </Field>
          </div>

          <button className="primary-action" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <BarChart3 size={18} />}
            Analyze Property
          </button>
          {error && <p className="error"><AlertTriangle size={16} /> {error}</p>}
        </form>

        <aside className="decision-panel">
          {!result ? (
            <div className="empty-state">
              <ShieldCheck size={42} />
              <h2>Decision brief</h2>
              <p>Run the analysis to generate a property score, risk readout, and action plan.</p>
            </div>
          ) : (
            <div className="results">
              <div className="score-row">
                <div className="score-ring"><span>{result.score}</span><small>/100</small></div>
                <div>
                  <span className={`verdict ${result.recommendation.toLowerCase().replaceAll(' ', '-')}`}>{result.recommendation}</span>
                  <h2>{result.summary}</h2>
                </div>
              </div>

              {(result.propertyId || result.analysisId || result.recommendationId) && (
                <dl className="result-meta">
                  <div><dt>Property ID</dt><dd>{result.propertyId}</dd></div>
                  <div><dt>Analysis ID</dt><dd>{result.analysisId}</dd></div>
                  <div><dt>Recommendation ID</dt><dd>{result.recommendationId}</dd></div>
                </dl>
              )}

              <div className="metrics-grid">
                <Metric icon={Banknote} label="Monthly cash flow" value={currency.format(result.metrics.monthlyCashFlow)} tone={result.metrics.monthlyCashFlow >= 0 ? 'good' : 'bad'} />
                <Metric icon={BarChart3} label="Cash-on-cash" value={`${result.metrics.cashOnCashReturn}%`} />
                <Metric icon={Home} label="Cap rate" value={`${result.metrics.capRate}%`} />
                <Metric icon={MapPin} label="Neighborhood" value={`${result.metrics.neighborhoodScore}/100`} />
              </div>

              <div className="insight-block">
                <h3>Risk notes</h3>
                <ul>{result.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
              </div>

              <div className="insight-block">
                <h3>Next steps</h3>
                <ul>{result.nextSteps.map((step) => <li key={step}><CheckCircle2 size={16} /> {step}</li>)}</ul>
              </div>

              {result.aiNote && <p className="ai-note"><Sparkles size={16} /> {result.aiNote}</p>}
            </div>
          )}
        </aside>

        <section className="history-panel" aria-label="Recent analysis history">
          <div className="section-heading">
            <Clock3 size={22} />
            <div>
              <h2>Recent History</h2>
              <p>Reload saved properties and prior underwriting runs.</p>
            </div>
          </div>

          <div className="history-controls">
            <Field label="Saved property">
              <select value={selectedPropertyId} onChange={(event) => setSelectedPropertyId(event.target.value)}>
                <option value="">Choose a saved property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address} - {property.propertyType}
                  </option>
                ))}
              </select>
            </Field>
            <button className="secondary-action" type="button" onClick={loadProperties} disabled={historyLoading}>
              {historyLoading ? <Loader2 className="spin" size={16} /> : <Database size={16} />}
              Refresh
            </button>
          </div>

          {historyError && <p className="error"><AlertTriangle size={16} /> {historyError}</p>}

          <div className="history-list">
            {propertyHistory.length === 0 && !historyLoading ? (
              <p className="muted">Saved analyses will appear here after a property is selected.</p>
            ) : propertyHistory.map((analysis) => (
              <button
                className="history-item"
                key={analysis.id}
                type="button"
                onClick={() => selectSavedAnalysis(analysis.id)}
              >
                <span>{new Date(analysis.createdAt).toLocaleString()}</span>
                <strong>{analysis.recommendation} - {analysis.score}/100</strong>
                <small>Analysis #{analysis.id}</small>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
