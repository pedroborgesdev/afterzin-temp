import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql';
import { QUERY_EVENTS, QUERY_EVENT } from '@/lib/graphql-operations';
import { mapApiEventToEvent, type Event } from '@/types/events';

interface EventsResponse {
  events: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    coverImage: string;
    location: string;
    address?: string | null;
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
          description?: string | null;
          price: number;
          audience: string;
          maxQuantity: number;
          soldQuantity: number;
        }>;
      }>;
    }>;
  }>;
}

interface EventResponse {
  event: EventsResponse['events'][0] | null;
}

export function useEvents(categoryFilter?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['events', categoryFilter],
    queryFn: async () => {
      const res = await graphqlClient.request<EventsResponse>(QUERY_EVENTS, {
        filter: categoryFilter && categoryFilter !== 'all' ? { category: categoryFilter } : undefined,
      });
      return (res.events ?? []).map(mapApiEventToEvent);
    },
  });

  const events: Event[] = data ?? [];
  const featuredEvents = events.filter((e) => e.featured);

  return { events, featuredEvents, isLoading, error };
}

export function useEvent(id: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await graphqlClient.request<EventResponse>(QUERY_EVENT, { id });
      if (!res.event) return null;
      return mapApiEventToEvent(res.event);
    },
    enabled: !!id,
  });

  return { event: data ?? null, isLoading, error };
}
