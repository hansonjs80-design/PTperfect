import { useState, useEffect, useCallback } from 'react';
import { supabase, isOnlineMode } from '../lib/supabase';
import { PatientVisit } from '../types';
import { useLocalStorage } from './useLocalStorage';

// Helper to get Local Date String (YYYY-MM-DD) correctly avoiding UTC shifts
const getLocalDateString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

export const usePatientLog = () => {
  // 1. Current Date State (Persisted)
  const [currentDate, setCurrentDate] = useLocalStorage<string>('physio-log-date', getLocalDateString());
  
  // 2. Visits State
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to get dynamic storage key for the specific date
  const getStorageKey = (date: string) => `physio-visits-${date}`;

  // Helper to safely save to localStorage without hooks
  const saveToLocalCache = (date: string, data: PatientVisit[]) => {
    try {
      window.localStorage.setItem(getStorageKey(date), JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  };

  // 3. Fetch Data (Strategy: Local Cache -> Then Network)
  const fetchVisits = useCallback(async (date: string) => {
    const dateKey = getStorageKey(date);
    setIsLoading(true);

    // A. Load from Local Cache first (Instant display)
    const cached = window.localStorage.getItem(dateKey);
    if (cached && cached !== "undefined" && cached !== "null" && cached.trim() !== "") {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setVisits(parsed);
        } else {
          setVisits([]);
        }
      } catch (e) {
        console.error('Cache parse error:', e);
        setVisits([]);
      }
    } else {
      setVisits([]); // Clear if no local data
    }

    // B. Fetch from Supabase (Authority)
    if (isOnlineMode() && supabase) {
      const { data, error } = await supabase
        .from('patient_visits')
        .select('*')
        .eq('visit_date', date)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching patient visits:', error);
      } else if (data) {
        // Server data overrides local cache to ensure consistency
        setVisits(data);
        saveToLocalCache(date, data);
      }
    }
    setIsLoading(false);
  }, []);

  // 4. Sync on Date Change & Realtime Subscription
  useEffect(() => {
    fetchVisits(currentDate);

    const client = supabase;
    if (client && isOnlineMode()) {
      const channel = client
        .channel(`public:patient_visits:${currentDate}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'patient_visits', filter: `visit_date=eq.${currentDate}` }, 
          () => {
            // Re-fetch when DB changes
            fetchVisits(currentDate);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    }
  }, [currentDate, fetchVisits]);

  // 5. Actions (Add/Update/Delete)
  const addVisit = useCallback(async (initialData: Partial<PatientVisit> = {}): Promise<string> => {
    const tempId = crypto.randomUUID();
    const newVisit: PatientVisit = {
      id: tempId,
      visit_date: currentDate,
      bed_id: null,
      patient_name: '',
      body_part: '',
      treatment_name: '',
      memo: '',
      author: '',
      is_injection: false,
      is_fluid: false,
      is_traction: false,
      is_eswt: false,
      is_manual: false,
      created_at: new Date().toISOString(),
      ...initialData
    };

    // Optimistic Update
    setVisits(prev => {
      const updated = [...prev, newVisit];
      saveToLocalCache(currentDate, updated);
      return updated;
    });

    // DB Sync
    if (isOnlineMode() && supabase) {
      // Omit ID to let DB generate one (if using default uuid) or use provided one
      // Since we generated a UUID client-side, we can try to use it, OR let DB gen one and update.
      // Here we use the client-side UUID as the primary key if the DB schema allows, or insert and get new one.
      // The current schema uses `uuid default gen_random_uuid()`, so we can pass our ID.
      const { data, error } = await supabase
        .from('patient_visits')
        .insert([newVisit]) 
        .select()
        .single();

      if (error) {
        console.error('Error adding visit to DB:', error);
        // If error, we might want to flag the local entry as "unsynced" in a future update
      } else if (data) {
        // Confirm sync
        setVisits(prev => {
          const updated = prev.map(v => v.id === tempId ? data : v);
          saveToLocalCache(currentDate, updated);
          return updated;
        });
        return data.id; 
      }
    }
    
    return tempId; 
  }, [currentDate]);

  const updateVisit = useCallback(async (id: string, updates: Partial<PatientVisit>) => {
    // Optimistic Update
    setVisits(prev => {
      const updated = prev.map(v => v.id === id ? { ...v, ...updates } : v);
      saveToLocalCache(currentDate, updated);
      return updated;
    });

    // DB Sync
    if (isOnlineMode() && supabase) {
      const { error } = await supabase
        .from('patient_visits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error updating visit:', error);
      }
    }
  }, [currentDate]);

  const deleteVisit = useCallback(async (id: string) => {
    // Optimistic Update
    setVisits(prev => {
      const updated = prev.filter(v => v.id !== id);
      saveToLocalCache(currentDate, updated);
      return updated;
    });

    // DB Sync
    if (isOnlineMode() && supabase) {
      const { error } = await supabase
        .from('patient_visits')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting visit:', error);
        fetchVisits(currentDate); // Revert on error
      }
    }
  }, [currentDate, fetchVisits]);

  const changeDate = useCallback((offset: number) => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + offset);
    const offsetMs = date.getTimezoneOffset() * 60000;
    const localISODate = new Date(date.getTime() - offsetMs).toISOString().split('T')[0];
    setCurrentDate(localISODate);
  }, [currentDate, setCurrentDate]);

  return {
    currentDate,
    setCurrentDate,
    visits,
    isLoading,
    addVisit,
    updateVisit,
    deleteVisit,
    changeDate
  };
};