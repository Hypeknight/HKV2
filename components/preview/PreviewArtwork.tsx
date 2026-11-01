'use client';
import { useState } from 'react';
/** Decorative artwork: event name and source remain readable when provider images fail. */
export default function PreviewArtwork({ image }: { image: string | null }) {
  const [failed, setFailed] = useState(false);
  return <div className="sc-artwork">{image && !failed ? <img src={image} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <div className="sc-no-art"><span aria-hidden="true">HK</span><p>Event image unavailable</p></div>}</div>;
}
