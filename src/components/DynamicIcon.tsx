import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function DynamicIcon({ name, size = 20, className, style }: DynamicIconProps) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>>)[name];
  if (!Icon) return <LucideIcons.BookOpen size={size} className={className} style={style} />;
  return <Icon size={size} className={className} style={style} />;
}
