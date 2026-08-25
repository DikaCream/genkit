export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" stroke="currentColor" strokeWidth="2" />
      <path d="M9 22V10h3l5 7 5-7h3v12h-3v-7l-5 7-5-7v7H9z" fill="currentColor" />
    </svg>
  );
}
