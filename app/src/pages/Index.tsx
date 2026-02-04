import { useState } from 'react';
import { Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FeaturedCarousel } from '@/components/events/FeaturedCarousel';
import { CategoryFilter } from '@/components/events/CategoryFilter';
import { EventCard } from '@/components/events/EventCard';
import { useEvents } from '@/hooks/useEvents';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { events, featuredEvents, isLoading, error } = useEvents(selectedCategory);

  const filteredEvents = events.filter(
    (event) =>
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      {/* Hero Carousel */}
      <section className="container pt-4 sm:pt-6 pb-6 sm:pb-8">
        {isLoading ? (
          <Skeleton className="w-full aspect-[2/1] rounded-2xl" />
        ) : (
          <FeaturedCarousel events={featuredEvents} />
        )}
      </section>

      {/* Search and Filter */}
      <section className="container mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 mb-5 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1">
                Descubra Eventos
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Encontre experiências incríveis
              </p>
            </div>

            <div className="relative w-full sm:w-72 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar eventos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card h-11"
              />
            </div>
          </div>

          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </section>

      {/* Events Grid */}
      <section className="container">
        {error && (
          <div className="text-center py-8 text-destructive text-sm">
            Não foi possível carregar os eventos. Verifique se a API está rodando.
          </div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            {filteredEvents.map((event, index) => (
              <div
                key={event.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
              >
                <EventCard event={event} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <p className="text-muted-foreground text-base sm:text-lg">
              Nenhum evento encontrado.
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Index;
