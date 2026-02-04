import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Tag, Share2, Heart, ArrowLeft, User } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEvent } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { TicketSelectionModal, TicketSelection } from '@/components/events/TicketSelectionModal';
import { CheckoutModal } from '@/components/events/CheckoutModal';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { graphqlClient } from '@/lib/graphql';
import { MUTATION_CHECKOUT_PREVIEW } from '@/lib/graphql-operations';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { event, isLoading, error } = useEvent(id);

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [ticketSelection, setTicketSelection] = useState<TicketSelection | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Layout>
        <Skeleton className="w-full h-[350px] rounded-none" />
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="container py-16 sm:py-20 text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Evento não encontrado</h1>
          <Button onClick={() => navigate('/')}>Voltar para Home</Button>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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

  const handleBuyClick = () => {
    if (!isAuthenticated) {
      navigate('/auth?redirect=' + encodeURIComponent(`/evento/${id}`));
    } else {
      setShowTicketModal(true);
    }
  };

  const handleTicketSelected = async (selection: TicketSelection) => {
    setShowTicketModal(false);
    try {
      const data = await graphqlClient.request<{ checkoutPreview: { checkoutId: string } }>(
        MUTATION_CHECKOUT_PREVIEW,
        {
          input: {
            items: [
              {
                eventDateId: selection.date.id,
                ticketTypeId: selection.selectedVariant.id,
                quantity: selection.quantity,
              },
            ],
          },
        }
      );
      const id = data?.checkoutPreview?.checkoutId;
      if (id) {
        setCheckoutId(id);
        setTicketSelection(selection);
        setShowCheckoutModal(true);
      } else {
        toast({ title: 'Erro', description: 'Não foi possível iniciar o checkout.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível iniciar o checkout.', variant: 'destructive' });
    }
  };

  const handleCheckoutSuccess = () => {
    setShowCheckoutModal(false);
    setTicketSelection(null);
    setCheckoutId(null);
    navigate('/mochila');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Confira este evento: ${event.name}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copiado!',
        description: 'Compartilhe com seus amigos.',
      });
    }
  };

  return (
    <Layout>
      <div className="relative h-[280px] sm:h-[350px] md:h-[400px] overflow-hidden">
        <img src={event.coverImage} alt={event.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors min-h-touch min-w-touch"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="container relative -mt-24 sm:-mt-28 pb-24 sm:pb-12">
        <div className="bg-card rounded-2xl sm:rounded-3xl shadow-elevated p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="flex-1 min-w-0">
              <Badge className="mb-3">
                {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
              </Badge>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                {event.name}
              </h1>
              <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6 text-muted-foreground text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>
                    {formatDate(event.dates[0].date)}
                    {event.dates.length > 1 && ` (+${event.dates.length - 1})`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>{event.dates[0].time}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 mb-6 sm:mb-8">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm sm:text-base">{event.location}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{event.address}</p>
                </div>
              </div>
              {event.producer && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="font-display text-lg sm:text-xl font-bold mb-3">Organizado por</h2>
                  <Link
                    to={`/produtor/perfil/${event.producer.id}`}
                    className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/20">
                      <AvatarImage src={event.producer.photoUrl ?? undefined} alt={event.producer.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="w-6 h-6 sm:w-7 sm:h-7" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{event.producer.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Ver perfil do produtor</p>
                    </div>
                  </Link>
                </div>
              )}
              <div className="mb-6 sm:mb-8">
                <h2 className="font-display text-lg sm:text-xl font-bold mb-3">Sobre o Evento</h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {event.description}
                </p>
              </div>
              <div className="mb-6 sm:mb-8">
                <h2 className="font-display text-lg sm:text-xl font-bold mb-3">Ingressos Disponíveis</h2>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{event.currentLot.name}</span>
                </div>
                <div className="grid gap-3 sm:gap-4">
                  {event.currentLot.tickets.map((ticket, idx) => (
                    <div
                      key={`${ticket.name}-${idx}`}
                      className="p-3 sm:p-4 bg-muted/50 rounded-xl border border-border"
                    >
                      <div className="mb-2">
                        <p className="font-medium text-sm sm:text-base">{ticket.name}</p>
                        {ticket.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {ticket.description}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {ticket.variants.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {v.audience === 'MALE'
                                ? '♂ Masculino'
                                : v.audience === 'FEMALE'
                                  ? '♀ Feminino'
                                  : v.audience === 'CHILD'
                                    ? 'Criança'
                                    : 'Geral'}
                              {' · '}
                              {v.available} disponíveis
                            </span>
                            <span className="font-bold text-primary">
                              R$ {v.price.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="hidden lg:block lg:w-72 xl:w-80 shrink-0">
              <div className="sticky top-20 bg-gradient-card rounded-2xl p-5 border border-border shadow-soft">
                <div className="text-center mb-5">
                  <p className="text-sm text-muted-foreground mb-1">A partir de</p>
                  <p className="text-3xl font-bold text-primary tabular-nums">
                    R$ {getLowestPrice().toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <Button className="w-full mb-3" size="lg" onClick={handleBuyClick}>
                  Comprar Ingresso
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" size="sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                    Compartilhar
                  </Button>
                  <Button variant="outline" size="sm" className="px-3">
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
                {!isAuthenticated && (
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    Faça login para comprar ingressos
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 pb-safe z-40">
        <div className="container flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">A partir de</p>
            <p className="text-xl font-bold text-primary tabular-nums">
              R$ {getLowestPrice().toFixed(2).replace('.', ',')}
            </p>
          </div>
          <Button size="lg" onClick={handleBuyClick} className="shrink-0">
            Comprar
          </Button>
          <Button variant="outline" size="icon" className="shrink-0" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <TicketSelectionModal
        event={event}
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        onProceed={handleTicketSelected}
      />

      {ticketSelection && (
        <CheckoutModal
          event={event}
          selection={ticketSelection}
          checkoutId={checkoutId}
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </Layout>
  );
}
