import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql';
import { QUERY_PRODUCER_PUBLIC_PROFILE } from '@/lib/graphql-operations';
import { mapApiEventToEvent } from '@/types/events';
import { cn } from '@/lib/utils';

export default function ProducerPublicProfile() {
  const { producerId } = useParams<{ producerId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['producerPublicProfile', producerId],
    queryFn: async () => {
      if (!producerId) return null;
      const res = await graphqlClient.request<{
        producerPublicProfile: {
          producer: { id: string; user: { id: string; name: string; photoUrl?: string | null }; companyName?: string | null };
          events: Array<{
            id: string;
            title: string;
            description: string;
            category: string;
            coverImage: string;
            location: string;
            address?: string | null;
            status: string;
            featured?: boolean | null;
            dates?: Array<{
              id: string;
              date: string;
              startTime?: string | null;
              endTime?: string | null;
              lots?: Array<{
                id: string;
                name: string;
                active: boolean;
                availableQuantity: number;
                totalQuantity: number;
                ticketTypes?: Array<{
                  id: string;
                  name: string;
                  price: number;
                  audience: string;
                  maxQuantity: number;
                  soldQuantity: number;
                }>;
              }>;
            }>;
          }>;
        };
      }>(QUERY_PRODUCER_PUBLIC_PROFILE, { producerId });
      return res.producerPublicProfile;
    },
    enabled: !!producerId,
  });

  if (isLoading || !producerId) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-24 w-full rounded-2xl mb-6" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground mb-4">Perfil não encontrado.</p>
          <Link to="/" className="text-primary hover:underline">
            Voltar ao início
          </Link>
        </div>
      </Layout>
    );
  }

  const { producer, events } = data;
  const userName = producer.user?.name ?? 'Produtor';
  const photoUrl = producer.user?.photoUrl ?? undefined;

  const eventsMapped = events.map((ev) => mapApiEventToEvent({ ...ev, producer: { id: producer.id, user: producer.user } }));

  return (
    <Layout>
      <div className="container py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 p-4 sm:p-6 rounded-2xl border border-border bg-card">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/20">
            <AvatarImage src={photoUrl} alt={userName} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              <User className="w-10 h-10 sm:w-12 sm:h-12" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">{userName}</h1>
            {producer.companyName && (
              <p className="text-muted-foreground text-sm sm:text-base mt-1">{producer.companyName}</p>
            )}
          </div>
        </div>

        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Eventos publicados
        </h2>

        {eventsMapped.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">
            Nenhum evento publicado ainda.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventsMapped.map((event) => {
              const isEnded = (data.events.find((e) => e.id === event.id)?.status ?? '') === 'ENDED';
              return (
                <Link
                  key={event.id}
                  to={`/evento/${event.id}`}
                  className={cn(
                    'block rounded-2xl border bg-card shadow-soft overflow-hidden transition-all duration-200',
                    isEnded
                      ? 'opacity-75 grayscale-[0.4] border-muted-foreground/20 hover:grayscale-0 hover:opacity-90'
                      : 'hover:shadow-elevated hover:border-primary/30'
                  )}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {event.coverImage ? (
                      <img
                        src={event.coverImage}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Calendar className="w-12 h-12" />
                      </div>
                    )}
                    {isEnded && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-muted-foreground/80 text-muted">
                          Encerrado
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-base line-clamp-1 mb-1">{event.name}</h3>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
