'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function addEventComment(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const eventId = String(formData.get('event_id') || '');
  const eventPath = String(formData.get('event_path') || '/events');
  const body = String(formData.get('body') || '').trim();

  if (!eventId) throw new Error('Missing event id.');
  if (!body) throw new Error('Comment cannot be empty.');
  if (body.length > 500) throw new Error('Comment must be 500 characters or less.');

  const { error } = await supabase.from('event_comments').insert({
    event_id: eventId,
    user_id: user.id,
    body,
    status: 'visible',
  });

  if (error) throw new Error(error.message);

  revalidatePath(eventPath);
}