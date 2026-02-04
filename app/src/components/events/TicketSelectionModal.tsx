import { useState } from 'react';
import { Minus, Plus, Calendar, X } from 'lucide-react';
import { Event, EventDate, TicketType, TicketTypeVariant } from '@/types/events';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface TicketSelectionModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onProceed: (selection: TicketSelection) => void;
}

export interface TicketSelection {
  date: EventDate;
  ticket: TicketType;
  selectedVariant: TicketTypeVariant;
  quantity: number;
  unitPrice: number;
  total: number;
}

const audienceLabels: Record<string, string> = {
  GENERAL: 'Geral',
  MALE: 'Masculino',
  FEMALE: 'Feminino',
  CHILD: 'Criança',
};

export function TicketSelectionModal({ event, isOpen, onClose, onProceed }: TicketSelectionModalProps) {
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<EventDate | null>(
    event.dates.length === 1 ? event.dates[0] : null
  );
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<TicketTypeVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'short',
      day: '2-digit', 
      month: 'short' 
    });
  };

  const handleProceed = () => {
    if (selectedDate && selectedTicket && selectedVariant) {
      const unitPrice = selectedVariant.price;
      onProceed({
        date: selectedDate,
        ticket: selectedTicket,
        selectedVariant,
        quantity,
        unitPrice,
        total: unitPrice * quantity,
      });
    }
  };

  const resetSelection = () => {
    setSelectedDate(event.dates.length === 1 ? event.dates[0] : null);
    setSelectedTicket(null);
    setSelectedVariant(null);
    setQuantity(1);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      resetSelection();
    }
  };

  const content = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Scrollable content - min-h-0 allows flex item to shrink so overflow-y-auto works */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 sm:px-6 pb-4">
        {/* Current Lot */}
        <div className="flex items-center gap-2 mb-4 mt-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">
            {event.currentLot.name}
          </Badge>
          <span className="text-sm text-muted-foreground">Lote Atual</span>
        </div>

        {/* Date Selection */}
        {event.dates.length > 1 && (
          <div className="mb-5">
            <h4 className="text-sm font-medium mb-2.5 text-foreground">Escolha a data</h4>
            <div className="flex flex-wrap gap-2">
              {event.dates.map((date) => (
                <button
                  key={date.id}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-touch touch-manipulation active:scale-95",
                    selectedDate?.id === date.id
                      ? "bg-gradient-primary text-primary-foreground shadow-soft"
                      : "bg-muted hover:bg-accent border border-border"
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  {formatDate(date.date)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ticket Types: um card por nome, com variantes (ex.: Pista → Homem 200, Mulher 100) */}
        <div className="mb-5">
          <h4 className="text-sm font-medium mb-2.5 text-foreground">Tipo de Ingresso</h4>
          <div className="space-y-4">
            {event.currentLot.tickets.map((ticket) => (
              <div
                key={ticket.name}
                className="rounded-xl border-2 border-border overflow-hidden bg-card"
              >
                <div className="p-3 sm:p-3.5 border-b border-border bg-muted/30">
                  <h5 className="font-semibold text-foreground">{ticket.name}</h5>
                  {ticket.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{ticket.description}</p>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {ticket.variants.map((variant) => {
                    const isSelected =
                      selectedTicket?.name === ticket.name && selectedVariant?.id === variant.id;
                    const disabled = variant.available <= 0;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setSelectedVariant(variant);
                        }}
                        className={cn(
                          "w-full p-3 sm:p-3.5 text-left transition-all min-h-touch touch-manipulation active:scale-[0.99] flex items-center justify-between gap-3",
                          isSelected
                            ? "bg-primary/10 border-l-4 border-l-primary"
                            : "hover:bg-accent/50",
                          disabled && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-foreground">
                            {audienceLabels[variant.audience] ?? variant.audience}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {variant.available} disponíveis
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary">
                            R$ {variant.price.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quantity */}
        {selectedTicket && selectedVariant && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2.5 text-foreground">Quantidade</h4>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors min-h-touch min-w-touch touch-manipulation active:scale-95 disabled:opacity-40"
                disabled={quantity <= 1}
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-2xl font-bold w-12 text-center tabular-nums">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity(Math.min(Math.min(10, selectedVariant.available), quantity + 1))
                }
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors min-h-touch min-w-touch touch-manipulation active:scale-95 disabled:opacity-40"
                disabled={quantity >= Math.min(10, selectedVariant.available)}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fixed footer with total and CTA */}
      {selectedTicket && selectedVariant && selectedDate && (
        <div className="border-t border-border p-4 sm:px-6 bg-card shrink-0 pb-safe">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-primary tabular-nums">
              R$ {(selectedVariant.price * quantity).toFixed(2).replace('.', ',')}
            </span>
          </div>
          <Button className="w-full" size="lg" onClick={handleProceed}>
            Continuar para Pagamento
          </Button>
        </div>
      )}
    </div>
  );

  // Use Drawer for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden">
          <DrawerHeader className="shrink-0 border-b border-border px-4 pb-3">
            <div className="flex items-center justify-between">
              <DrawerTitle className="font-display text-xl">Selecionar Ingresso</DrawerTitle>
              <DrawerClose asChild>
                <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 p-4 sm:p-6 pb-0">
          <DialogTitle className="font-display text-xl sm:text-2xl">Selecionar Ingresso</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
