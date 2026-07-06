import { ReactNode } from 'react';

export default function ActionButton({
  children,
  variant = 'primary',
  type = 'submit',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  type?: 'submit' | 'button';
}) {
  const classes = {
    primary: 'bg-accent text-black hover:opacity-90',
    secondary: 'border border-white/10 bg-white/5 text-white hover:border-accent/40',
    danger: 'border border-red-500/20 bg-red-500/10 text-red-200 hover:border-red-500/40',
    warning: 'border border-yellow-500/20 bg-yellow-500/10 text-yellow-200 hover:border-yellow-500/40',
    success: 'border border-green-500/20 bg-green-500/10 text-green-200 hover:border-green-500/40',
  };

  return (
    <button
      type={type}
      className={`w-full rounded-2xl px-5 py-3 font-semibold transition ${classes[variant]}`}
    >
      {children}
    </button>
  );
}