import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { initialManagerEvents, type ManagerEvent, CURRENT_CLUB } from "@/data/managerEvents";

interface EventsContextValue {
  events: ManagerEvent[];
  myClub: string;
  approve: (id: string) => void;
  reject: (id: string, reason: string) => void;
  addEvent: (e: ManagerEvent) => void;
  removeEvent: (id: string) => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export const EventsProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<ManagerEvent[]>(initialManagerEvents);

  const approve = useCallback((id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "approved", rejectionReason: undefined } : e))
    );
  }, []);

  const reject = useCallback((id: string, reason: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "rejected", rejectionReason: reason } : e))
    );
  }, []);

  const addEvent = useCallback((e: ManagerEvent) => {
    setEvents((prev) => [e, ...prev]);
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const value = useMemo(
    () => ({ events, myClub: CURRENT_CLUB, approve, reject, addEvent, removeEvent }),
    [events, approve, reject, addEvent, removeEvent]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
};

export const useEvents = () => {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within EventsProvider");
  return ctx;
};