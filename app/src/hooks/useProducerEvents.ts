import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql';
import {
  QUERY_PRODUCER_EVENTS,
  QUERY_EVENT,
  MUTATION_CREATE_EVENT,
  MUTATION_UPDATE_EVENT,
  MUTATION_PUBLISH_EVENT,
  MUTATION_UPDATE_EVENT_STATUS,
  MUTATION_CREATE_EVENT_DATE,
  MUTATION_CREATE_LOT,
  MUTATION_CREATE_TICKET_TYPE,
} from '@/lib/graphql-operations';

export interface ProducerEventDate {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  lots: ProducerLot[];
}

export interface ProducerTicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  audience: string;
  maxQuantity: number;
  soldQuantity: number;
}

export interface ProducerLot {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  totalQuantity: number;
  availableQuantity: number;
  active: boolean;
  ticketTypes: ProducerTicketType[];
}

export interface ProducerEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  coverImage: string;
  location: string;
  address: string | null;
  status: string;
  featured: boolean | null;
  dates: ProducerEventDate[];
}

function producerEventsResponse(): Promise<{ producerEvents: ProducerEvent[] }> {
  return graphqlClient.request(QUERY_PRODUCER_EVENTS);
}

export function useProducerEvents() {
  return useQuery({
    queryKey: ['producerEvents'],
    queryFn: async () => {
      const data = await producerEventsResponse();
      return data.producerEvents ?? [];
    },
  });
}

export function useProducerEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      if (!id) return null;
      const data = await graphqlClient.request<{ event: ProducerEvent | null }>(QUERY_EVENT, { id });
      return data.event;
    },
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      category: string;
      coverImage: string;
      location: string;
      address?: string | null;
    }) => {
      const data = await graphqlClient.request<{ createEvent: { id: string } }>(MUTATION_CREATE_EVENT, {
        input: {
          title: input.title,
          description: input.description,
          category: input.category,
          coverImage: input.coverImage,
          location: input.location,
          address: input.address ?? null,
        },
      });
      return data.createEvent.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producerEvents'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: {
        title?: string | null;
        description?: string | null;
        category?: string | null;
        coverImage?: string | null;
        location?: string | null;
        address?: string | null;
      };
    }) => {
      await graphqlClient.request(MUTATION_UPDATE_EVENT, { id, input });
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['producerEvents'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.id] });
    },
  });
}

export function usePublishEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await graphqlClient.request(MUTATION_PUBLISH_EVENT, { id });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['producerEvents'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
  });
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await graphqlClient.request(MUTATION_UPDATE_EVENT_STATUS, { id, status });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['producerEvents'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
  });
}

export function useCreateEventDate(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; startTime?: string | null; endTime?: string | null }) => {
      const data = await graphqlClient.request<{ createEventDate: { id: string } }>(
        MUTATION_CREATE_EVENT_DATE,
        { eventId, input }
      );
      return data.createEventDate.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producerEvents'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });
}

export function useCreateLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dateId,
      input,
    }: {
      dateId: string;
      input: {
        name: string;
        startsAt: string;
        endsAt: string;
        totalQuantity: number;
      };
    }) => {
      const data = await graphqlClient.request<{ createLot: { id: string } }>(MUTATION_CREATE_LOT, {
        dateId,
        input,
      });
      return data.createLot.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producerEvents'] });
      queryClient.invalidateQueries({ queryKey: ['event'] });
    },
  });
}

export function useCreateTicketType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lotId,
      input,
    }: {
      lotId: string;
      input: {
        name: string;
        description?: string | null;
        price: number;
        audience: string;
        maxQuantity: number;
      };
    }) => {
      const data = await graphqlClient.request<{ createTicketType: { id: string } }>(
        MUTATION_CREATE_TICKET_TYPE,
        { lotId, input }
      );
      return data.createTicketType.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producerEvents'] });
      queryClient.invalidateQueries({ queryKey: ['event'] });
    },
  });
}
