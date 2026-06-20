export async function enhanceWithAi(input, decision) {
  if (!process.env.OPENAI_API_KEY) {
    return 'Local deterministic analysis used. Add OPENAI_API_KEY to enable an AI-written deal memo.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: `Write one concise property investment note. Inputs: ${JSON.stringify(input)}. Decision: ${JSON.stringify(decision)}`
      })
    });

    if (!response.ok) {
      return 'AI enhancement was configured but unavailable; local analysis is shown.';
    }

    const data = await response.json();
    return data.output_text || 'AI enhancement completed; local metrics remain the source of truth.';
  } catch (_error) {
    return 'AI enhancement was unavailable; local analysis is shown.';
  }
}
