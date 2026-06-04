'use client';

import { useState } from 'react';

export default function EventFlyerUpload({
  defaultUrl = '',
}: {
  defaultUrl?: string | null;
}) {
  const [flyerUrl, setFlyerUrl] = useState(defaultUrl || '');
  const [preview, setPreview] = useState(defaultUrl || '');
  const [loading, setLoading] = useState(false);

  async function uploadFile(file: File) {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/events/upload-flyer', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setFlyerUrl(data.publicUrl);
      setPreview(data.publicUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <label className="block text-sm font-medium text-white">
        Event Flyer / Card Image
      </label>

      <p className="mt-2 text-sm text-white/60">
        Upload the image guests will see on the event card.
      </p>

      <input type="hidden" name="flyer_url" value={flyerUrl} />

      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) uploadFile(file);
        }}
        className="mt-4 block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
      />

      {loading ? (
        <p className="mt-3 text-sm text-accent">Uploading flyer...</p>
      ) : null}

      {preview ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <img
            src={preview}
            alt="Event flyer preview"
            className="h-auto w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}