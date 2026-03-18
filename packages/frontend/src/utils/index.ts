import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'running':
    case 'success':
    case 'healthy':
    case 'online':
      return 'text-green-500';
    case 'pending':
    case 'unknown':
      return 'text-yellow-500';
    case 'failed':
    case 'unhealthy':
    case 'offline':
      return 'text-red-500';
    case 'stopped':
    case 'paused':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'running':
    case 'success':
    case 'healthy':
    case 'online':
      return 'bg-green-500/10';
    case 'pending':
    case 'unknown':
      return 'bg-yellow-500/10';
    case 'failed':
    case 'unhealthy':
    case 'offline':
      return 'bg-red-500/10';
    case 'stopped':
    case 'paused':
      return 'bg-gray-500/10';
    default:
      return 'bg-gray-500/10';
  }
}

export function getLevelColor(level: string): string {
  switch (level) {
    case 'success':
      return 'text-green-500';
    case 'info':
      return 'text-blue-500';
    case 'warning':
      return 'text-yellow-500';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}
