/** Tipos de evento usados na UI (catálogo, detalhe, checkout). */

export interface EventDate {
  id: string;
  date: string;
  time: string;
}

/** Uma variante de ingresso (ex.: Pista Homem 200, Pista Mulher 100) — corresponde a um ticket_type no backend. */
export interface TicketTypeVariant {
  id: string;
  audience: string;
  price: number;
  available: number;
  total: number;
}

/** Tipo de ingresso na UI: um card pode ter várias variantes (ex.: Pista com Homem 200 + Mulher 100). */
export interface TicketType {
  name: string;
  description: string;
  variants: TicketTypeVariant[];
}

export interface Lot {
  id: string;
  name: string;
  status: 'active' | 'sold_out' | 'ended';
  tickets: TicketType[];
}

/** Dados do publicador (produtor) do evento para exibição e link ao perfil. */
export interface EventProducer {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  coverImage: string;
  location: string;
  address: string;
  dates: EventDate[];
  currentLot: Lot;
  featured?: boolean;
  producer?: EventProducer;
}

export const categories = [
  { id: 'all', name: 'Todos', icon: '🎉' },
  { id: 'shows', name: 'Shows', icon: '🎤' },
  { id: 'festas', name: 'Festas', icon: '🎊' },
  { id: 'esportes', name: 'Esportes', icon: '⚽' },
  { id: 'teatro', name: 'Teatro', icon: '🎭' },
  { id: 'festivais', name: 'Festivais', icon: '🎪' },
] as const;

/** Mapeia evento da API GraphQL para o tipo Event da UI. */
export function mapApiEventToEvent(api: {
  id: string;
  title: string;
  description: string;
  category: string;
  coverImage: string;
  location: string;
  address?: string | null;
  featured?: boolean | null;
  producer?: {
    id: string;
    user?: { id: string; name: string; photoUrl?: string | null };
  } | null;
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
}): Event {
  const dates: EventDate[] = (api.dates ?? []).map((d) => ({
    id: d.id,
    date: d.date,
    time: d.startTime ?? '',
  }));

  let currentLot: Lot = {
    id: '',
    name: 'Nenhum lote',
    status: 'ended',
    tickets: [],
  };

  for (const d of api.dates ?? []) {
    const activeLot = d.lots?.find((l) => l.active);
    if (activeLot?.ticketTypes?.length) {
      // Agrupa por nome: um card "Pista" pode ter variantes Homem 200, Mulher 100
      const byName = new Map<string, { name: string; description: string; variants: TicketTypeVariant[] }>();
      for (const tt of activeLot.ticketTypes) {
        const available = tt.maxQuantity - tt.soldQuantity;
        const variant: TicketTypeVariant = {
          id: tt.id,
          audience: tt.audience,
          price: tt.price,
          available,
          total: tt.maxQuantity,
        };
        const key = tt.name;
        if (!byName.has(key)) {
          byName.set(key, { name: tt.name, description: tt.description ?? '', variants: [] });
        }
        byName.get(key)!.variants.push(variant);
      }
      const tickets: TicketType[] = Array.from(byName.values());
      currentLot = {
        id: activeLot.id,
        name: activeLot.name,
        status: activeLot.availableQuantity <= 0 ? 'sold_out' : 'active',
        tickets,
      };
      break;
    }
  }

  const producer: EventProducer | undefined = api.producer
    ? {
        id: api.producer.id,
        name: api.producer.user?.name ?? 'Produtor',
        photoUrl: api.producer.user?.photoUrl ?? null,
      }
    : undefined;

  return {
    id: api.id,
    name: api.title,
    description: api.description,
    category: api.category,
    coverImage: api.coverImage,
    location: api.location,
    address: api.address ?? '',
    dates,
    currentLot,
    featured: api.featured ?? false,
    producer,
  };
}
