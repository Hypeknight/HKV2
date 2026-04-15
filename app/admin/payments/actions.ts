'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updateStripeMode(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const stripeMode = String(formData.get('stripe_mode') || 'test');

  await supabase
    .from('payment_settings')
    .update({
      stripe_mode: stripeMode,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  redirect('/admin/payments?saved=1');
}