export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}
