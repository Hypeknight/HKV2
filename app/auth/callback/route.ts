import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { authHref, safeReturnPath } from '@/lib/auth/return-path';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeReturnPath(url.searchParams.get('next'));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://hypeknight.fun';
  const code = url.searchParams.get('code');
  let failed = !code || url.searchParams.has('error');
  if (!failed) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code!);
      failed = Boolean(error);
    } catch { failed = true; }
  }
  if (failed) return NextResponse.redirect(new URL(authHref('login', next) + '&error=confirmation_failed', siteUrl));
  revalidatePath('/', 'layout');
  return NextResponse.redirect(new URL(next, siteUrl));
}
