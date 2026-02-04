import { cn } from '@/lib/utils';
import { categories } from '@/types/events';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x-mandatory">
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 snap-start min-h-touch touch-manipulation active:scale-95",
            selectedCategory === category.id
              ? "bg-gradient-primary text-primary-foreground shadow-soft"
              : "bg-card hover:bg-accent text-foreground border border-border"
          )}
        >
          <span className="text-sm sm:text-base">{category.icon}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
}
