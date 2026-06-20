import { query, withTransaction } from '../db/pool.js';

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizePropertyIdentity(input = {}) {
  return {
    normalizedAddress: normalizeText(input.address),
    propertyType: normalizeText(input.propertyType) || 'unknown'
  };
}

function toNumber(value) {
  return Number(value) || 0;
}

function rowToProperty(row) {
  return {
    id: Number(row.id),
    address: row.address,
    propertyType: row.property_type,
    latestRecommendation: row.recommendation ?? null,
    latestScore: row.score ?? null,
    latestSummary: row.summary ?? null,
    latestAnalysisId: row.analysis_id ? Number(row.analysis_id) : null,
    latestRecommendationId: row.recommendation_id ? Number(row.recommendation_id) : null,
    latestAnalyzedAt: row.latest_analyzed_at ?? null,
    updatedAt: row.updated_at
  };
}

function rowToAnalysis(row) {
  return {
    id: Number(row.id),
    propertyId: Number(row.property_id),
    inputSnapshot: row.input_snapshot,
    metrics: row.metrics,
    risks: row.risks,
    nextSteps: row.next_steps,
    recommendationId: row.recommendation_id ? Number(row.recommendation_id) : null,
    recommendation: row.recommendation ?? null,
    score: row.score ?? null,
    summary: row.summary ?? null,
    aiNote: row.ai_note ?? null,
    createdAt: row.created_at
  };
}

export async function upsertProperty(client, input) {
  const { normalizedAddress, propertyType } = normalizePropertyIdentity(input);

  const result = await client.query(
    `
      insert into properties (
        address,
        normalized_address,
        property_type,
        purchase_price,
        estimated_value,
        down_payment,
        interest_rate,
        loan_term_years,
        monthly_rent,
        monthly_expenses,
        repair_cost,
        vacancy_rate,
        neighborhood_score,
        risk_tolerance,
        goal
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      on conflict (normalized_address, property_type)
      do update set
        address = excluded.address,
        purchase_price = excluded.purchase_price,
        estimated_value = excluded.estimated_value,
        down_payment = excluded.down_payment,
        interest_rate = excluded.interest_rate,
        loan_term_years = excluded.loan_term_years,
        monthly_rent = excluded.monthly_rent,
        monthly_expenses = excluded.monthly_expenses,
        repair_cost = excluded.repair_cost,
        vacancy_rate = excluded.vacancy_rate,
        neighborhood_score = excluded.neighborhood_score,
        risk_tolerance = excluded.risk_tolerance,
        goal = excluded.goal,
        updated_at = now()
      returning id
    `,
    [
      String(input.address || 'Unknown address').trim() || 'Unknown address',
      normalizedAddress || 'unknown address',
      propertyType,
      toNumber(input.purchasePrice),
      toNumber(input.estimatedValue),
      toNumber(input.downPayment),
      toNumber(input.interestRate),
      toNumber(input.loanTermYears),
      toNumber(input.monthlyRent),
      toNumber(input.monthlyExpenses),
      toNumber(input.repairCost),
      toNumber(input.vacancyRate),
      toNumber(input.neighborhoodScore),
      input.riskTolerance || null,
      input.goal || null
    ]
  );

  return Number(result.rows[0].id);
}

export async function insertAnalysisHistory(client, propertyId, input, decision) {
  const result = await client.query(
    `
      insert into analysis_history (property_id, input_snapshot, metrics, risks, next_steps)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [
      propertyId,
      JSON.stringify(input),
      JSON.stringify(decision.metrics),
      JSON.stringify(decision.risks),
      JSON.stringify(decision.nextSteps)
    ]
  );

  return Number(result.rows[0].id);
}

export async function insertRecommendation(client, analysisId, savedResult) {
  const result = await client.query(
    `
      insert into recommendations (analysis_id, recommendation, score, summary, ai_note)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [
      analysisId,
      savedResult.recommendation,
      savedResult.score,
      savedResult.summary,
      savedResult.aiNote || null
    ]
  );

  return Number(result.rows[0].id);
}

export async function savePropertyAnalysis(input, decision, aiNote) {
  return withTransaction(async (client) => {
    const propertyId = await upsertProperty(client, input);
    const analysisId = await insertAnalysisHistory(client, propertyId, input, decision);
    const recommendationId = await insertRecommendation(client, analysisId, { ...decision, aiNote });

    return {
      ...decision,
      aiNote,
      propertyId,
      analysisId,
      recommendationId
    };
  });
}

export async function listProperties() {
  const result = await query(`
    select distinct on (p.id)
      p.id,
      p.address,
      p.property_type,
      p.updated_at,
      ah.id as analysis_id,
      ah.created_at as latest_analyzed_at,
      r.id as recommendation_id,
      r.recommendation,
      r.score,
      r.summary
    from properties p
    left join analysis_history ah on ah.property_id = p.id
    left join recommendations r on r.analysis_id = ah.id
    order by p.id, ah.created_at desc nulls last
  `);

  return result.rows
    .map(rowToProperty)
    .sort((a, b) => new Date(b.latestAnalyzedAt || b.updatedAt) - new Date(a.latestAnalyzedAt || a.updatedAt));
}

export async function listAnalysisHistory(propertyId) {
  const result = await query(
    `
      select
        ah.id,
        ah.property_id,
        ah.input_snapshot,
        ah.metrics,
        ah.risks,
        ah.next_steps,
        ah.created_at,
        r.id as recommendation_id,
        r.recommendation,
        r.score,
        r.summary,
        r.ai_note
      from analysis_history ah
      left join recommendations r on r.analysis_id = ah.id
      where ah.property_id = $1
      order by ah.created_at desc
    `,
    [propertyId]
  );

  return result.rows.map(rowToAnalysis);
}

export async function getAnalysisById(analysisId) {
  const result = await query(
    `
      select
        ah.id,
        ah.property_id,
        ah.input_snapshot,
        ah.metrics,
        ah.risks,
        ah.next_steps,
        ah.created_at,
        r.id as recommendation_id,
        r.recommendation,
        r.score,
        r.summary,
        r.ai_note
      from analysis_history ah
      left join recommendations r on r.analysis_id = ah.id
      where ah.id = $1
    `,
    [analysisId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return rowToAnalysis(result.rows[0]);
}
