'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { authHref, safeReturnPath } from '@/lib/auth/return-path';

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = safeReturnPath(formData.get('next'));
  let failed = !email || !password;
  if (!failed) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      failed = Boolean(error);
    } catch { failed = true; }
  }
  if (failed) redirect(authHref('login', next) + '&error=sign_in_failed');
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const displayName = String(formData.get('display_name') || '').trim();
  const next = safeReturnPath(formData.get('next'));
  let failed = !email || password.length < 8 || !displayName;
  let signedIn = false;
  if (!failed) {
    try {
      const supabase = await createClient();
      const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const callback = new URL('/auth/callback', origin);
      callback.searchParams.set('next', next);
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: callback.toString(), data: { display_name: displayName } },
      });
      failed = Boolean(error);
      signedIn = Boolean(data?.session);
    } catch { failed = true; }
  }
  if (failed) redirect(authHref('sign-up', next) + '&error=sign_up_failed');
  if (signedIn) {
    revalidatePath('/', 'layout');
    redirect(next);
  }
  redirect(authHref('login', next) + '&message=confirmation_sent');
}

export async function signOut() {
  let failed = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    failed = Boolean(error);
  } catch { failed = true; }
  revalidatePath('/', 'layout');
  if (failed) redirect('/auth/login?error=sign_out_failed');
  redirect('/');
}
