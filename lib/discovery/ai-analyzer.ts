import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CitySignal = {
  city: string;
  state?: string | null;
  searchCount: number;
  uniqueUsers: number;
  hypeknightEventCount: number;
  externalEventCount: number;
  priorityLevel: string;
  preferredKeywords?: string[] | null;
};

export async function analyzeDiscoverySignals(signals: CitySignal[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content:
          'You are the HypeKnight discovery analyst. Recommend safe admin actions for event discovery based on search demand, city inventory, and external event availability. Do not invent facts.',
      },
      {
        role: 'user',
        content: JSON.stringify({ signals }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'hypeknight_discovery_recommendations',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  city: { type: 'string' },
                  state: { type: ['string', 'null'] },
                  recommendation_type: {
                    type: 'string',
                    enum: [
                      'import_external_events',
                      'promote_city',
                      'seek_hypeknight_events',
                      'watch_trend',
                    ],
                  },
                  priority_level: {
                    type: 'string',
                    enum: ['low', 'normal', 'high', 'critical'],
                  },
                  reason: { type: 'string' },
                  suggested_keyword: { type: ['string', 'null'] },
                },
                required: [
                  'city',
                  'state',
                  'recommendation_type',
                  'priority_level',
                  'reason',
                  'suggested_keyword',
                ],
              },
            },
          },
          required: ['recommendations'],
        },
        strict: true,
      },
    },
  });

  const output = response.output_text;

  return JSON.parse(output) as {
    recommendations: Array<{
      city: string;
      state: string | null;
      recommendation_type:
        | 'import_external_events'
        | 'promote_city'
        | 'seek_hypeknight_events'
        | 'watch_trend';
      priority_level: 'low' | 'normal' | 'high' | 'critical';
      reason: string;
      suggested_keyword: string | null;
    }>;
  };
}