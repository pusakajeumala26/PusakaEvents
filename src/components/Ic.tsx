/** Ikon garis (mask CSS, lihat globals.css). `n` = nama kelas ikon, mis. "i-check". */
export function Ic({ n, size, className = '' }: { n: string; size?: number; className?: string }) {
  return (
    <i
      className={`ic ${n} ${className}`.trim()}
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}
    />
  );
}
