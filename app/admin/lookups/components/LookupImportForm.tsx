'use client';

import { useMemo, useState } from 'react';
import { importLookupCsv } from '../actions';

type Category = {
  category_key: string;
  name: string;
  is_active: boolean;
};

type PreviewRow = {
  rowNumber: number;
  categoryKey: string;
  value: string;
  displayName: string;
  status: 'ready' | 'warning' | 'invalid';
  message: string;
};

type Props = {
  categories: Category[];
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 100;

export default function LookupImportForm({
  categories,
}: Props) {
  const [fileName, setFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [fileError, setFileError] = useState('');

  const categoryKeys = useMemo(
    () => new Set(categories.map((category) => category.category_key)),
    [categories]
  );

  const preview = useMemo(
    () =>
      buildPreview(
        csvContent,
        selectedCategory,
        categoryKeys
      ),
    [csvContent, selectedCategory, categoryKeys]
  );

  const readyCount = preview.filter(
    (row) => row.status === 'ready'
  ).length;

  const warningCount = preview.filter(
    (row) => row.status === 'warning'
  ).length;

  const invalidCount = preview.filter(
    (row) => row.status === 'invalid'
  ).length;

  async function handleFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    setFileError('');
    setCsvContent('');
    setFileName('');

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Choose a CSV file.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('CSV files must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }

    try {
      const content = await file.text();

      if (!content.trim()) {
        setFileError('The selected CSV file is empty.');
        return;
      }

      setFileName(file.name);
      setCsvContent(content);
    } catch {
      setFileError('The selected file could not be read.');
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        Upload and Preview
      </p>

      <h2 className="mt-2 text-3xl font-black text-white">
        Prepare lookup import
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
        Select a CSV, review the detected values, then submit the file for
        server-side validation and insertion.
      </p>

      <form
        action={importLookupCsv}
        encType="multipart/form-data"
        className="mt-6 space-y-6"
      >
        <label className="block">
          <span className="text-sm font-semibold text-white/70">
            Category Override
          </span>

          <select
            name="category_override"
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
            className={fieldClass}
          >
            <option value="">
              Use category_key from each CSV row
            </option>

            {categories.map((category) => (
              <option
                key={category.category_key}
                value={category.category_key}
              >
                {category.name}
                {!category.is_active ? ' — disabled category' : ''}
              </option>
            ))}
          </select>

          <span className="mt-2 block text-xs leading-5 text-white/40">
            Selecting a category applies it to every imported row and ignores
            the CSV category_key column.
          </span>
        </label>

        <label className="block rounded-2xl border border-dashed border-white/20 bg-black/20 p-6 text-center">
          <span className="block text-lg font-black text-white">
            Choose CSV file
          </span>

          <span className="mt-2 block text-sm text-white/45">
            Maximum size: 2 MB
          </span>

          <input
            name="csv_file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={handleFile}
            className="mt-5 w-full text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:py-3 file:font-semibold file:text-black"
          />
        </label>

        {fileName ? (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
            <p className="font-semibold text-green-100">
              {fileName}
            </p>

            <p className="mt-1 text-sm text-green-100/60">
              {preview.length} row
              {preview.length === 1 ? '' : 's'} detected in preview.
            </p>
          </div>
        ) : null}

        {fileError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
            {fileError}
          </div>
        ) : null}

        {preview.length ? (
          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <PreviewMetric
                label="Ready"
                value={readyCount}
                tone="green"
              />

              <PreviewMetric
                label="Warnings"
                value={warningCount}
                tone="yellow"
              />

              <PreviewMetric
                label="Invalid"
                value={invalidCount}
                tone="red"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-[70px_1fr_1fr_120px] gap-3 border-b border-white/10 bg-black/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
                <span>Row</span>
                <span>Category</span>
                <span>Value</span>
                <span>Status</span>
              </div>

              <div className="max-h-[520px] divide-y divide-white/10 overflow-y-auto">
                {preview.map((row) => (
                  <div
                    key={`${row.rowNumber}-${row.categoryKey}-${row.value}`}
                    className="grid grid-cols-[70px_1fr_1fr_120px] gap-3 px-4 py-4 text-sm"
                  >
                    <span className="text-white/40">
                      {row.rowNumber}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-white">
                        {row.categoryKey || 'Missing'}
                      </p>

                      <p className="mt-1 truncate text-xs text-white/35">
                        {row.message}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {row.displayName || 'Missing display name'}
                      </p>

                      <p className="mt-1 truncate font-mono text-xs text-white/35">
                        {row.value || 'Missing value'}
                      </p>
                    </div>

                    <PreviewStatus status={row.status} />
                  </div>
                ))}
              </div>
            </div>

            {preview.length >= MAX_PREVIEW_ROWS ? (
              <p className="text-sm text-white/40">
                Preview limited to the first {MAX_PREVIEW_ROWS} data rows.
                The complete file will still be validated by the server.
              </p>
            ) : null}
          </section>
        ) : null}

        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <input
            name="skip_duplicates"
            type="checkbox"
            defaultChecked
            className="mt-1 h-4 w-4"
          />

          <span>
            <span className="block font-semibold text-white">
              Skip duplicate values
            </span>

            <span className="mt-1 block text-xs leading-5 text-white/45">
              Continue importing valid rows when the same stored value already
              exists in its category.
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={!csvContent || invalidCount > 0}
          className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Validate and Import CSV
        </button>
      </form>
    </section>
  );
}

function buildPreview(
  csvContent: string,
  categoryOverride: string,
  categoryKeys: Set<string>
): PreviewRow[] {
  if (!csvContent.trim()) return [];

  const parsedRows = parseCsv(csvContent);

  if (parsedRows.length < 2) return [];

  const headers = parsedRows[0].map(normalizeHeader);
  const indexes = {
    categoryKey: headers.indexOf('category_key'),
    value: headers.indexOf('value'),
    displayName: headers.indexOf('display_name'),
  };

  return parsedRows
    .slice(1, MAX_PREVIEW_ROWS + 1)
    .filter((row) =>
      row.some((cell) => cell.trim().length > 0)
    )
    .map((row, index) => {
      const categoryKey =
        categoryOverride ||
        getCell(row, indexes.categoryKey);

      const displayName = getCell(
        row,
        indexes.displayName
      );

      const value =
        getCell(row, indexes.value) ||
        createStoredValue(displayName);

      if (!displayName) {
        return {
          rowNumber: index + 2,
          categoryKey,
          value,
          displayName,
          status: 'invalid',
          message: 'display_name is required.',
        };
      }

      if (!categoryKey) {
        return {
          rowNumber: index + 2,
          categoryKey,
          value,
          displayName,
          status: 'invalid',
          message: 'category_key is required.',
        };
      }

      if (!categoryKeys.has(categoryKey)) {
        return {
          rowNumber: index + 2,
          categoryKey,
          value,
          displayName,
          status: 'invalid',
          message: 'Category does not exist.',
        };
      }

      if (!value) {
        return {
          rowNumber: index + 2,
          categoryKey,
          value,
          displayName,
          status: 'invalid',
          message: 'Stored value could not be generated.',
        };
      }

      if (!getCell(row, indexes.value)) {
        return {
          rowNumber: index + 2,
          categoryKey,
          value,
          displayName,
          status: 'warning',
          message: 'Stored value will be generated.',
        };
      }

      return {
        rowNumber: index + 2,
        categoryKey,
        value,
        displayName,
        status: 'ready',
        message: 'Ready for server validation.',
      };
    });
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  const normalized = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const nextCharacter = normalized[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (character === '\n' && !quoted) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += character;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function getCell(row: string[], index: number) {
  if (index < 0) return '';
  return String(row[index] || '').trim();
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function createStoredValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function PreviewMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'green' | 'yellow' | 'red';
}) {
  const classes = {
    green: 'border-green-500/20 bg-green-500/10',
    yellow: 'border-yellow-500/20 bg-yellow-500/10',
    red: 'border-red-500/20 bg-red-500/10',
  };

  return (
    <div className={`rounded-2xl border p-4 ${classes[tone]}`}>
      <p className="text-xs uppercase tracking-[0.15em] text-white/45">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function PreviewStatus({
  status,
}: {
  status: PreviewRow['status'];
}) {
  const classes = {
    ready:
      'border-green-500/20 bg-green-500/10 text-green-200',
    warning:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
    invalid:
      'border-red-500/20 bg-red-500/10 text-red-200',
  };

  return (
    <span
      className={`h-fit rounded-full border px-3 py-1 text-center text-xs font-semibold capitalize ${classes[status]}`}
    >
      {status}
    </span>
  );
}

const fieldClass =
  'mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50';