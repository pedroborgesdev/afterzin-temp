import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Event } from '@/types/events';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FeaturedCarouselProps {
  events: Event[];
}

export function FeaturedCarousel({ events }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [events.length]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
  }, [events.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % events.length);
  }, [events.length]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  const currentEvent = events[currentIndex];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
    });
  };

  if (!currentEvent) return null;

  return (
    <div 
      className="relative h-[380px] sm:h-[420px] md:h-[480px] lg:h-[520px] overflow-hidden rounded-2xl md:rounded-3xl touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Images */}
      {events.map((event, index) => (
        <div
          key={event.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            index === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <img
            src={event.coverImage}
            alt={event.name}
            className="w-full h-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
          />
          {/* Gradient Overlays - improved for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="absolute inset-0 flex items-end sm:items-center">
        <div className="container pb-16 sm:pb-0">
          <div className="max-w-lg lg:max-w-xl animate-fade-in">
            <span className="inline-block px-2.5 py-1 bg-primary text-primary-foreground text-xs sm:text-sm font-medium rounded-full mb-3">
              🔥 Em Destaque
            </span>
            
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-2 sm:mb-3 leading-tight line-clamp-2">
              {currentEvent.name}
            </h1>
            
            <p className="text-primary-foreground/80 text-sm sm:text-base mb-4 line-clamp-2 hidden xs:block">
              {currentEvent.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-primary-foreground/70 text-sm mb-5 sm:mb-6">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(currentEvent.dates[0].date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[150px] sm:max-w-none">{currentEvent.location}</span>
              </div>
            </div>

            <Link to={`/evento/${currentEvent.id}`}>
              <Button variant="hero" size="lg" className="w-full xs:w-auto">
                Comprar Ingresso
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Arrows - hidden on touch devices, larger touch targets */}
      <button
        onClick={goPrev}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-background/30 transition-colors hidden sm:flex min-h-touch min-w-touch"
        aria-label="Evento anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-background/30 transition-colors hidden sm:flex min-h-touch min-w-touch"
        aria-label="Próximo evento"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots - larger for mobile touch */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
        {events.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300 min-h-[8px]",
              index === currentIndex
                ? "w-6 sm:w-8 bg-primary"
                : "w-2 bg-primary-foreground/50 hover:bg-primary-foreground/70"
            )}
            aria-label={`Ir para evento ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
