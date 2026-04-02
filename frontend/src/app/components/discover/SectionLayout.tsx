import { ReactNode } from "react";

interface SectionLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function SectionLayout({ title, subtitle, children }: SectionLayoutProps) {
  return (
    <section className="mt-8 mb-6">
      <div className="mb-4 flex items-end justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-6 overflow-x-auto pb-6 px-4 sm:px-6 lg:px-8 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `
          ::-webkit-scrollbar { display: none; }
        `}} />
        {children}
      </div>
    </section>
  );
}
