import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TicketCardProps {
  ticket: {
    id: string;
    eventId: string;
    eventName: string;
    eventImage: string;
    ticketType: string;
    date: string;
    time: string;
    location: string;
    qrCode: string;
  };
  onOpen: () => void;
}

export function TicketCard({ ticket, onOpen }: TicketCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric' 
    });
  };

  return (
    <div className="bg-card rounded-xl sm:rounded-2xl overflow-hidden shadow-card hover-lift group">
      <div className="relative h-28 sm:h-32 overflow-hidden">
        <img 
          src={ticket.eventImage} 
          alt={ticket.eventName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
        <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3 sm:left-3 sm:right-3">
          <span className="inline-block px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded">
            {ticket.ticketType}
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="font-display font-bold text-base sm:text-lg mb-2 line-clamp-1">{ticket.eventName}</h3>
        
        <div className="flex flex-col gap-1 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{formatDate(ticket.date)} às {ticket.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{ticket.location}</span>
          </div>
        </div>

        <Button onClick={onOpen} className="w-full" size="sm">
          <ExternalLink className="w-4 h-4" />
          Abrir Ticket
        </Button>
      </div>
    </div>
  );
}
