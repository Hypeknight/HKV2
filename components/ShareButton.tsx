'use client';

type ShareButtonProps = {
  title: string;
  text?: string;
  path: string;
};

export default function ShareButton({ title, text, path }: ShareButtonProps) {
  async function handleShare() {
    const url = `${window.location.origin}${path}`;

    if (navigator.share) {
      await navigator.share({
        title,
        text: text || title,
        url,
      });

      return;
    }

    await navigator.clipboard.writeText(url);
    alert('Link copied!');
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-white hover:border-accent/40"
    >
      Share
    </button>
  );
}