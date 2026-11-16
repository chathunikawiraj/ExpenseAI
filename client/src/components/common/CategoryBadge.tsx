import React from 'react';
import {
  Utensils,
  Car,
  Film,
  GraduationCap,
  Zap,
  HeartPulse,
  ShoppingBag,
  MoreHorizontal,
  Tag
} from 'lucide-react';

interface CategoryBadgeProps {
  name: string;
  color?: string;
  icon?: string;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  Utensils,
  Car,
  Film,
  GraduationCap,
  Zap,
  HeartPulse,
  ShoppingBag,
  MoreHorizontal,
  Tag,
};

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  name,
  color = '#9275F5',
  icon,
  className = '',
}) => {
  const IconComponent = (icon && iconMap[icon]) || Tag;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${className}`}
      style={{
        backgroundColor: `${color}18`, // 10% opacity
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <IconComponent className="w-3.5 h-3.5" />
      <span>{name}</span>
    </span>
  );
};
