import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

type LogDiscoverySearchInput = {
  searchQuery?: string;
  city?: string;
  state?: string;
  sourceFilter?: string;
  dateFilter?: string;
  resultCount: number;
  hypeknightResultCount: number;
  externalResultCount: number;
  pagePath?: string;
};

export async function logDiscoverySearch(input: LogDiscoverySearchInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const h = await headers();

  await supabase.from('discovery_search_logs').insert({
    user_id: user?.id || null,
    search_query: input.searchQuery || null,
    city: input.city || null,
    state: input.state || null,
    source_filter: input.sourceFilter || null,
    date_filter: input.dateFilter || null,
    result_count: input.resultCount,
    hypeknight_result_count: input.hypeknightResultCount,
    external_result_count: input.externalResultCount,
    page_path: input.pagePath || null,
    user_agent: h.get('user-agent'),
  });
}