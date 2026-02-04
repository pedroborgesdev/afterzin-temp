import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { graphqlClient, setToken, getToken } from '@/lib/graphql';
import {
  MUTATION_LOGIN,
  MUTATION_REGISTER,
  QUERY_ME,
  QUERY_MY_TICKETS,
} from '@/lib/graphql-operations';

interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  avatar?: string;
  photoUrl?: string;
}

interface Ticket {
  id: string;
  eventId: string;
  eventName: string;
  eventImage: string;
  ticketType: string;
  date: string;
  time: string;
  location: string;
  qrCode: string;
  holderName: string;
  holderCpf: string;
  purchaseDate: string;
}

interface AuthContextType {
  user: User | null;
  tickets: Ticket[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: Omit<User, 'id'> & { password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  addTicket: (ticket: Omit<Ticket, 'id' | 'holderName' | 'holderCpf' | 'purchaseDate'>) => void;
  refreshTickets: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapApiUser(u: { id: string; name: string; email: string; cpf: string; birthDate: string; photoUrl?: string | null }): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    cpf: u.cpf,
    birthDate: u.birthDate,
    avatar: u.photoUrl ?? undefined,
    photoUrl: u.photoUrl ?? undefined,
  };
}

function mapApiTicket(t: {
  id: string;
  code: string;
  qrCode: string;
  used: boolean;
  createdAt: string;
  event?: { id: string; title: string; coverImage: string; location: string } | null;
  eventDate?: { id: string; date: string; startTime?: string | null } | null;
  ticketType?: { id: string; name: string } | null;
  owner?: { id: string; name: string; cpf: string } | null;
}): Ticket {
  return {
    id: t.id,
    eventId: t.event?.id ?? '',
    eventName: t.event?.title ?? '',
    eventImage: t.event?.coverImage ?? '',
    ticketType: t.ticketType?.name ?? '',
    date: t.eventDate?.date ?? '',
    time: t.eventDate?.startTime ?? '',
    location: t.event?.location ?? '',
    qrCode: t.qrCode,
    holderName: t.owner?.name ?? '',
    holderCpf: t.owner?.cpf ?? '',
    purchaseDate: t.createdAt?.split('T')[0] ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTickets = async () => {
    if (!getToken()) return;
    try {
      const data = await graphqlClient.request<{ myTickets: unknown[] }>(QUERY_MY_TICKETS);
      const list = (data?.myTickets ?? []).map((t: unknown) => mapApiTicket(t as Parameters<typeof mapApiTicket>[0]));
      setTickets(list);
    } catch {
      // ignore
    }
  };

  const refreshUser = async () => {
    if (!getToken()) return;
    try {
      const data = await graphqlClient.request<{ me: { id: string; name: string; email: string; cpf: string; birthDate: string; photoUrl?: string | null } | null }>(QUERY_ME);
      if (data?.me) setUser(mapApiUser(data.me));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await graphqlClient.request<{ me: { id: string; name: string; email: string; cpf: string; birthDate: string; photoUrl?: string | null } | null }>(QUERY_ME);
        if (data?.me) {
          setUser(mapApiUser(data.me));
          await refreshTickets();
        } else {
          setToken(null);
        }
      } catch {
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await graphqlClient.request<{ login: { token: string; user: unknown } }>(MUTATION_LOGIN, {
        input: { email, password },
      });
      if (data?.login?.token) {
        setToken(data.login.token);
        setUser(mapApiUser(data.login.user as Parameters<typeof mapApiUser>[0]));
        await refreshTickets();
        return true;
      }
    } catch {
      // API error
    }
    return false;
  };

  const register = async (data: Omit<User, 'id'> & { password: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await graphqlClient.request<{ register: { token: string; user: unknown } }>(MUTATION_REGISTER, {
        input: {
          name: data.name,
          email: data.email,
          password: data.password,
          cpf: data.cpf,
          birthDate: data.birthDate,
        },
      });
      if (res?.register?.token) {
        setToken(res.register.token);
        setUser(mapApiUser(res.register.user as Parameters<typeof mapApiUser>[0]));
        await refreshTickets();
        return { success: true };
      }
    } catch (err: any) {
      if (err?.response?.errors?.[0]?.message?.includes('UNIQUE constraint failed: users.cpf')) {
        return { success: false, error: 'CPF já cadastrado.' };
      }
      return { success: false, error: 'E-mail já cadastrado ou dados inválidos.' };
    }
    return { success: false, error: 'E-mail já cadastrado ou dados inválidos.' };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTickets([]);
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) setUser({ ...user, ...data });
  };

  const addTicket = (ticketData: Omit<Ticket, 'id' | 'holderName' | 'holderCpf' | 'purchaseDate'>) => {
    if (user) {
      setTickets((prev) => [
        ...prev,
        {
          ...ticketData,
          id: `ticket-${Date.now()}`,
          holderName: user.name,
          holderCpf: user.cpf,
          purchaseDate: new Date().toISOString().split('T')[0],
        },
      ]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tickets,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        addTicket,
        refreshTickets,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
