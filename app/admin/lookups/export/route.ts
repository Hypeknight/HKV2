import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ExportRow = {
  category_key: string;
  value: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  archived_at: string | null;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return jsonError(authError.message, 401);
  }

  if (!user) {
    return jsonError('Authentication required.', 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return jsonError(profileError.message, 500);
  }

  if (profile?.app_role !== 'admin') {
    return jsonError(
      'You do not have permission to export lookup data.',
      403
    );
  }

  const categoryKey = clean(
    request.nextUrl.searchParams.get('category')
  );

  const includeArchived = parseBoolean(
    request.nextUrl.searchParams.get('include_archived')
  );

  const includeInactive =
    request.nextUrl.searchParams.get('include_inactive') === null
      ? true
      : parseBoolean(
          request.nextUrl.searchParams.get('include_inactive')
        );

  if (categoryKey) {
    const { data: category, error: categoryError } =
      await supabase
        .from('lookup_categories')
        .select('category_key, name')
        .eq('category_key', categoryKey)
        .maybeSingle();

    if (categoryError) {
      return jsonError(categoryError.message, 500);
    }

    if (!category) {
      return jsonError(
        `Lookup category "${categoryKey}" was not found.`,
        404
      );
    }
  }

  let lookupQuery = supabase
    .from('lookup_values')
    .select(`
      category_key,
      value,
      display_name,
      description,
      icon,
      color,
      sort_order,
      is_active,
      archived_at
    `)
    .order('category_key', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('display_name', { ascending: true });

  if (categoryKey) {
    lookupQuery = lookupQuery.eq(
      'category_key',
      categoryKey
    );
  }

  if (!includeArchived) {
    lookupQuery = lookupQuery.is('archived_at', null);
  }

  if (!includeInactive) {
    lookupQuery = lookupQuery.eq('is_active', true);
  }

  const { data, error } = await lookupQuery;

  if (error) {
    return jsonError(error.message, 500);
  }

  const rows = normalizeRows(data ?? []);
  const csv = createLookupCsv(rows);

  const scopeName = categoryKey
    ? safeFilePart(categoryKey)
    : 'full-registry';

  const datePart = new Date()
    .toISOString()
    .slice(0, 10);

  const filename =
    `hypeknight-lookups-${scopeName}-${datePart}.csv`;

  return new Response(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': contentDisposition(filename),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function normalizeRows(
  rows: Array<Record<string, unknown>>
): ExportRow[] {
  return rows.map((row) => ({
    category_key: String(row.category_key || ''),
    value: String(row.value || ''),
    display_name: String(row.display_name || ''),
    description:
      row.description === null ||
      row.description === undefined
        ? null
        : String(row.description),
    icon:
      row.icon === null || row.icon === undefined
        ? null
        : String(row.icon),
    color:
      row.color === null || row.color === undefined
        ? null
        : String(row.color),
    sort_order: Number(row.sort_order ?? 100),
    is_active: row.is_active === true,
    archived_at:
      row.archived_at === null ||
      row.archived_at === undefined
        ? null
        : String(row.archived_at),
  }));
}

function createLookupCsv(rows: ExportRow[]) {
  const headers = [
    'category_key',
    'value',
    'display_name',
    'description',
    'icon',
    'color',
    'sort_order',
    'is_active',
    'archived_at',
  ] as const;

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCsvCell(row[header]))
        .join(',')
    ),
  ];

  return lines.join('\r\n');
}

function escapeCsvCell(value: unknown) {
  const text =
    value === null || value === undefined
      ? ''
      : String(value);

  const spreadsheetSafeText =
    /^[=+\-@]/.test(text)
      ? `'${text}`
      : text;

  if (
    spreadsheetSafeText.includes(',') ||
    spreadsheetSafeText.includes('"') ||
    spreadsheetSafeText.includes('\n') ||
    spreadsheetSafeText.includes('\r')
  ) {
    return `"${spreadsheetSafeText.replaceAll(
      '"',
      '""'
    )}"`;
  }

  return spreadsheetSafeText;
}

function contentDisposition(filename: string) {
  const asciiName = filename.replace(
    /[^a-zA-Z0-9._-]/g,
    '-'
  );

  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(
    filename
  )}`;
}

function parseBoolean(value: string | null) {
  if (!value) return false;

  return ['1', 'true', 'yes', 'on'].includes(
    value.trim().toLowerCase()
  );
}

function clean(value: string | null) {
  return String(value || '').trim();
}

function safeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'lookups';
}

function jsonError(message: string, status: number) {
  return Response.json(
    {
      error: message,
    },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}