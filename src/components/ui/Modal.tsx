import React from 'react';
import { cn } from '@/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, className }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn("relative z-50 w-full max-w-lg rounded-lg bg-card p-6 shadow-lg", className)}>
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 hover:bg-accent"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

interface TabsProps {
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue || '');
  
  return (
    <div className={cn("w-full", className)}>
      {React.Children.map(children, (child: any) => {
        if (child?.type?.name === 'TabList') {
          return React.cloneElement(child, { activeTab, setActiveTab });
        }
        if (child?.type?.name === 'TabContent') {
          return child.props.value === activeTab ? child : null;
        }
        return child;
      })}
    </div>
  );
};

interface TabListProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const TabList: React.FC<TabListProps> = ({ activeTab, setActiveTab, children, className }) => {
  return (
    <div className={cn("flex space-x-1 rounded-lg bg-secondary p-1", className)}>
      {React.Children.map(children, (child: any) => {
        return React.cloneElement(child, { activeTab, setActiveTab });
      })}
    </div>
  );
};

interface TabProps {
  value: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tab: React.FC<TabProps> = ({ value, activeTab, setActiveTab, children, className }) => {
  const isActive = activeTab === value;
  
  return (
    <button
      onClick={() => setActiveTab?.(value)}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-all",
        isActive
          ? "bg-background text-foreground shadow"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
};

interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({ children, className }) => {
  return <div className={cn("mt-4", className)}>{children}</div>;
};

interface ProgressProps {
  value?: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value = 0, className }) => {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, fallback, className }) => {
  const [error, setError] = React.useState(false);
  
  return (
    <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary", className)}>
      {src && !error ? (
        <img src={src} alt={alt || ''} className="h-full w-full rounded-full object-cover" onError={() => setError(true)} />
      ) : (
        <span className="text-sm font-medium">{fallback || '?'}</span>
      )}
    </div>
  );
};

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [show, setShow] = React.useState(false);
  
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-50 rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md">
          {content}
        </div>
      )}
    </div>
  );
};
