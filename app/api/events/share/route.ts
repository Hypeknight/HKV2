import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SHARE_CHANNELS = [
  'native_share',
  'copy_link',
  'sms',
  'email',
] as const;

type ShareChannel =
  (typeof SHARE_CHANNELS)[number];

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const eventId = String(
      body?.eventId || ''
    ).trim();

    const channel = String(
      body?.channel || ''
    ).trim() as ShareChannel;

    if (!eventId) {
      return NextResponse.json(
        {
          error: 'Missing event id.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      !SHARE_CHANNELS.includes(channel)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid share channel.',
        },
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('event_shares')
      .insert({
        event_id: eventId,
        user_id: user?.id || null,
        channel,
      });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to record share.',
      },
      {
        status: 500,
      }
    );
  }
}