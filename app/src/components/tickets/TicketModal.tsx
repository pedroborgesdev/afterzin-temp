import { Calendar, MapPin, Clock, User, CreditCard, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer';

interface TicketModalProps {
  ticket: {
    id: string;
    eventName: string;
    eventImage: string;
    ticketType: string;
    date: string;
    time: string;
    location: string;
    qrCode: string;
    holderName: string;
    holderCpf: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function TicketModal({ ticket, isOpen, onClose }: TicketModalProps) {
  const isMobile = useIsMobile();

  const qrValue = (ticket.qrCode ?? '').trim();
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'short',
      day: '2-digit', 
      month: 'short',
      year: 'numeric' 
    });
  };

  const content = (
    <div className="flex flex-col">
      {/* Ticket Header */}
      <div className="bg-gradient-primary text-primary-foreground p-4 sm:p-6 relative">
        {isMobile ? (
          <DrawerClose asChild>
            <button className="absolute top-3 right-3 p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </DrawerClose>
        ) : (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-lg transition-colors"
            aria-label="Fechar"
            type="button"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
        <div className="text-center mb-4 pr-8 sm:pr-0">
          <h2 className="font-display text-lg sm:text-xl font-bold line-clamp-2">
            {ticket.eventName}
          </h2>
        </div>

        <div className="flex flex-col gap-1.5 text-sm opacity-90">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{formatDate(ticket.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{ticket.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{ticket.location}</span>
          </div>
        </div>
      </div>

      {/* Perforation line */}
      <div className="relative bg-card">
        <div className="absolute inset-x-0 flex justify-between -translate-y-1/2">
          <div className="w-5 h-5 bg-background rounded-full -ml-2.5" />
          <div className="w-5 h-5 bg-background rounded-full -mr-2.5" />
        </div>
        <div className="border-b border-dashed border-border" />
      </div>

      {/* QR Code Section */}
      <div className="p-4 sm:p-6 text-center bg-card pb-safe">
        <p className="text-sm text-muted-foreground mb-3">Apresente este QR Code na entrada</p>
        
        {/* QR Code */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto bg-card p-2.5 sm:p-3 rounded-xl shadow-soft mb-4 border border-border">
          <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
            {qrValue ? (
              <QRCodeSVG
                value={qrValue}
                size={144}
                bgColor="transparent"
                fgColor="currentColor"
                level="M"
                includeMargin={false}
                className="text-foreground"
              />
            ) : (
              <span className="text-xs text-muted-foreground">QR indisponível</span>
            )}
          </div>
        </div>

        {/* Ticket Code */}
        <div className="bg-muted rounded-lg px-3 py-2 mb-4 inline-block">
          <p className="text-[10px] text-muted-foreground">Código</p>
          <p className="font-mono font-bold text-xs sm:text-sm">{ticket.qrCode}</p>
        </div>

        {/* Holder Info */}
        <div className="border-t border-border pt-4 space-y-2.5 text-left max-w-xs mx-auto">
          <div className="flex items-center justify-between text-sm gap-2">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <User className="w-4 h-4" />
              <span>Titular</span>
            </div>
            <span className="font-medium truncate">{ticket.holderName}</span>
          </div>
          <div className="flex items-center justify-between text-sm gap-2">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <CreditCard className="w-4 h-4" />
              <span>CPF</span>
            </div>
            <span className="font-medium font-mono">{ticket.holderCpf}</span>
          </div>
          <div className="flex items-center justify-between text-sm gap-2">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <span className="w-4 h-4 flex items-center justify-center text-sm">🎫</span>
              <span>Tipo</span>
            </div>
            <span className="font-medium text-primary">{ticket.ticketType}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent className="max-h-[92vh] p-0">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideCloseButton className="max-w-xs sm:max-w-sm p-0 overflow-hidden gap-0">
        {content}
      </DialogContent>
    </Dialog>
  );
}
