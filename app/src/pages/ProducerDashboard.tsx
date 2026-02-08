import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Megaphone, MapPin, Pencil, BarChart3, ExternalLink, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducerEvents } from '@/hooks/useProducerEvents';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { StripeOnboarding } from '@/components/producer/StripeOnboarding';

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  PAUSED: 'Pausado',
  ENDED: 'Encerrado',
};

const statusVariant: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'default',
  PAUSED: 'outline',
  ENDED: 'destructive',
};

export default function ProducerDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: events = [], isLoading: eventsLoading, error } = useProducerEvents();

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Megaphone className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Área do Produtor</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Faça login para criar e gerenciar seus eventos, lotes e ingressos.
          </p>
          <Button asChild>
            <Link to="/auth?redirect=/produtor">Entrar</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Área do Produtor</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Crie e gerencie seus eventos, lotes e ingressos
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" asChild>
              <Link to="/produtor/validar" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Validar ingressos
              </Link>
            </Button>
            <Button asChild>
              <Link to="/produtor/eventos/novo" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Criar evento
              </Link>
            </Button>
          </div>
        </div>

        {/* Stripe Connect onboarding */}
        <section className="mb-6">
          <StripeOnboarding />
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Meus Eventos
          </h2>

          {error && (
            <p className="text-destructive text-sm">Não foi possível carregar os eventos.</p>
          )}

          {eventsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 sm:p-10 text-center shadow-soft">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-6">
                Você ainda não criou eventos. Clique em &quot;Criar evento&quot; para publicar seu primeiro evento.
              </p>
              <Button asChild>
                <Link to="/produtor/eventos/novo" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Criar primeiro evento
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const totalSold =
                  event.dates?.reduce(
                    (acc, d) =>
                      acc +
                      (d.lots?.reduce(
                        (a, l) =>
                          a +
                          (l.ticketTypes?.reduce((s, tt) => s + (tt.soldQuantity ?? 0), 0) ?? 0),
                        0
                      ) ?? 0),
                    0
                  ) ?? 0;
                const canViewPublic = event.status === 'PUBLISHED' || event.status === 'PAUSED';
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'group rounded-2xl border bg-card shadow-soft overflow-hidden',
                      'hover:shadow-elevated hover:border-primary/30 transition-all duration-200'
                    )}
                  >
                    <Link to={`/produtor/eventos/${event.id}`} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {event.coverImage ? (
                          <img
                            src={event.coverImage}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Calendar className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant={statusVariant[event.status] ?? 'secondary'}>
                            {statusLabels[event.status] ?? event.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-display font-semibold text-base line-clamp-1 mb-1">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm mb-2">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5" />
                            {totalSold} vendidos
                          </span>
                          <span className="text-primary text-sm font-medium flex items-center gap-1">
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </span>
                        </div>
                      </div>
                    </Link>
                    {canViewPublic && (
                      <div className="px-4 pb-4 pt-0">
                        <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                          <a href={`/evento/${event.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ver evento (página pública)
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
