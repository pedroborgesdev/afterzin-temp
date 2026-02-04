import { Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Event } from '@/types/events';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getLowestPrice = () => {
    let lowest = Infinity;
    event.currentLot.tickets.forEach((ticket) => {
      ticket.variants.forEach((v) => {
        if (v.price < lowest) lowest = v.price;
      });
    });
    return lowest === Infinity ? 0 : lowest;
  };

  return (
    <Link to={`/evento/${event.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-card shadow-card hover-lift">
        {/* Image */}
        <div className="aspect-[4/3] overflow-hidden">
          <img 
            src={event.coverImage} 
            alt={event.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />
          
          {/* Category Badge */}
          <Badge className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-primary text-primary-foreground text-xs">
            {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
          </Badge>

          {/* Featured Badge */}
          {event.featured && (
            <Badge variant="secondary" className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-accent/90 backdrop-blur-sm text-accent-foreground text-xs">
              ⭐ Destaque
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="font-display text-base sm:text-lg font-bold text-primary-foreground mb-1.5 sm:mb-2 line-clamp-1">
            {event.name}
          </h3>
          
          <div className="flex items-center gap-2 sm:gap-3 text-primary-foreground/80 text-xs sm:text-sm mb-2 sm:mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span>
                {formatDate(event.dates[0].date)}
                {event.dates.length > 1 && ` +${event.dates.length - 1}`}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-primary-foreground/60 text-[10px] sm:text-xs">A partir de</span>
              <p className="text-primary-foreground font-bold text-base sm:text-lg">
                R$ {getLowestPrice().toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium shrink-0 group-active:bg-primary">
              Ver Detalhes
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
