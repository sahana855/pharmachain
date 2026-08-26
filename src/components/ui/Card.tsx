import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  gradient?: boolean;
}

export default function Card({ title, subtitle, icon, children, className = '', action, gradient = false }: CardProps) {
  return (
    <div className={`${gradient ? 'glass-card' : 'glass-card-solid'} ${className} transition-all duration-200 hover:shadow-2xl hover:shadow-indigo-500/10`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-gray-100/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className="text-primary-500">{icon}</div>}
            <div>
              {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
