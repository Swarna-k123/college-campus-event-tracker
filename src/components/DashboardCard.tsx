import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const DashboardCard = ({ title, subtitle, action, children, className }: DashboardCardProps) => (
  <div
    className={cn(
      "rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-soft backdrop-blur-xl",
      "transition-all duration-300 hover:border-primary/40 hover:shadow-glow hover:-translate-y-0.5",
      className
    )}
  >
    {(title || action) && (
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          {title && <h3 className="text-base font-semibold tracking-tight">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon: ReactNode;
}

export const StatCard = ({ label, value, delta, icon }: StatCardProps) => (
  <DashboardCard className="p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
        {delta && <p className="text-xs text-accent mt-1">{delta}</p>}
      </div>
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary/20 text-primary border border-primary/30">
        {icon}
      </div>
    </div>
  </DashboardCard>
);