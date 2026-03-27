
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isOnlineMode } from '../lib/supabase';
import { PatientVisit } from '../types';
import { useLocalStorage } from './useLocalStorage';

/** 폴링 간격 (ms) */
const POLL_INTERVAL = 5000;

/** DB 쓰기 디바운스 (ms) */
const DB_WRITE_DEBOUNCE = 300;
const RETRYABLE_OPTIONAL_COLUMNS = ['special_note', 'is_injection_completed', 'is_ion', 'is_exercise', 'gender', 'chart_number'] as const;

// Helper to get Local Date String (YYYY-MM-DD)
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

  // 디바운스 타이머 Ref (visit ID → timeout)
  const dbWriteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingUpdates = useRef<Map<string, Partial<PatientVisit>>>(new Map());

  const getStorageKey = (date: string) => `physio-visits-${date}`;

  const saveToLocalCache = (date: string, data: PatientVisit[]) => {
    try {
      window.localStorage.setItem(getStorageKey(date), JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  };

  // 3. Fetch Data (Local Cache → Network)
  const fetchVisits = useCallback(async (date: string) => {
    const dateKey = getStorageKey(date);
    setIsLoading(true);

    // A. Load from Local Cache first
    const cached = window.localStorage.getItem(dateKey);
    if (cached && cached !== "undefined" && cached !== "null" && cached.trim() !== "") {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setVisits(parsed);
        else setVisits([]);
      } catch (e) {
        setVisits([]);
      }
    } else {
      setVisits([]);
    }

    // B. Fetch from Supabase
    if (isOnlineMode() && supabase) {
      const { data, error } = await supabase
        .from('patient_visits')
        .select('*')
        .eq('visit_date', date)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setVisits(data);
        saveToLocalCache(date, data);
      }
    }
    setIsLoading(false);
  }, []);

  // 4. Sync on Date Change + Realtime + Polling
  useEffect(() => {
    fetchVisits(currentDate);

    const client = supabase;
    let channel: any = null;

    if (client && isOnlineMode()) {
      // postgres_changes (작동 시 즉시 반영)
      channel = client
        .channel(`public:patient_visits:${currentDate}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'patient_visits', filter: `visit_date=eq.${currentDate}` },
          (payload) => {
            const { eventType, new: newRow, old: oldRow } = payload;

            if (eventType === 'INSERT' && newRow) {
              setVisits(prev => {
                if (prev.some(v => v.id === newRow.id)) return prev;
                const updated = [...prev, newRow as PatientVisit];
                saveToLocalCache(currentDate, updated);
                return updated;
              });
            } else if (eventType === 'UPDATE' && newRow) {
              setVisits(prev => {
                const updated = prev.map(v => v.id === newRow.id ? { ...v, ...newRow } as PatientVisit : v);
                saveToLocalCache(currentDate, updated);
                return updated;
              });
            } else if (eventType === 'DELETE' && oldRow) {
              setVisits(prev => {
                const updated = prev.filter(v => v.id !== oldRow.id);
                saveToLocalCache(currentDate, updated);
                return updated;
              });
            }
          }
        )
        .subscribe();
    }

    // 폴링 백업 (5초)
    const poll = setInterval(() => {
      if (isOnlineMode() && supabase) {
        supabase.from('patient_visits')
          .select('*')
          .eq('visit_date', currentDate)
          .order('created_at', { ascending: true })
          .then(({ data, error }) => {
            if (!error && data) {
              setVisits(prev => {
                // 서버 데이터가 다를 때만 업데이트 (불필요한 리렌더 방지)
                const serverIds = data.map(d => d.id).join(',');
                const localIds = prev.map(v => v.id).join(',');
                if (serverIds === localIds && data.length === prev.length) {
                  // ID 동일 → 개별 필드 비교해서 변경된 것만 머지
                  let changed = false;
                  const merged = prev.map(v => {
                    const sv = data.find(d => d.id === v.id);
                    if (!sv) { changed = true; return v; }
                    const svTime = sv.updated_at ? new Date(sv.updated_at).getTime() : 0;
                    const lvTime = v.updated_at ? new Date(v.updated_at as string).getTime() : 0;
                    if (svTime > lvTime) { changed = true; return { ...v, ...sv } as PatientVisit; }
                    return v;
                  });
                  if (!changed) return prev;
                  saveToLocalCache(currentDate, merged);
                  return merged;
                }
                saveToLocalCache(currentDate, data);
                return data;
              });
            }
          });
      }
    }, POLL_INTERVAL);

    return () => {
      if (client && channel) client.removeChannel(channel);
      clearInterval(poll);
    };
  }, [currentDate, fetchVisits]);

  // 5. Actions

  const shouldRetryInsertWithoutOptionalFields = (error: { message?: string | null; details?: string | null }) => {
    const raw = `${error.message || ''} ${error.details || ''}`.toLowerCase();
    return RETRYABLE_OPTIONAL_COLUMNS.some((column) => raw.includes(column));
  };

  const addVisit = useCallback(async (initialData: Partial<PatientVisit> = {}): Promise<string> => {
    const tempId = crypto.randomUUID();
    const newVisit: PatientVisit = {
      id: tempId,
      visit_date: currentDate,
      bed_id: null,
      patient_name: '',
      body_part: '',
      gender: '',
      treatment_name: '',
      memo: '',
      author: '',
      is_injection: false,
      is_fluid: false,
      is_traction: false,
      is_eswt: false,
      is_manual: false,
      is_ion: false,
        is_exercise: false,
      created_at: new Date().toISOString(),
      ...initialData
    };

    // Optimistic Update
    setVisits(prev => {
      const updated = [...prev, newVisit];
      saveToLocalCache(currentDate, updated);
      return updated;
    });

    const retryInsertWithoutOptionalFields = async (row: PatientVisit) => {
      const fallbackRow = { ...row } as any;
      RETRYABLE_OPTIONAL_COLUMNS.forEach((column) => {
        delete fallbackRow[column];
      });

      const { data: retryData, error: retryError } = await supabase!
        .from('patient_visits')
        .insert([fallbackRow])
        .select()
        .single();

      if (retryError) {
        console.error('Retry insert without optional fields failed:', retryError);
        fetchVisits(currentDate);
        return null;
      }

      return retryData;
    };

    // DB Sync
    if (isOnlineMode() && supabase) {
      const { data, error } = await supabase
        .from('patient_visits')
        .insert([newVisit])
        .select()
        .single();

      if (error) {
        const shouldRetryWithoutOptional = shouldRetryInsertWithoutOptionalFields(error);

        if (shouldRetryWithoutOptional) {
          const retryData = await retryInsertWithoutOptionalFields(newVisit);
          if (retryData) {
            setVisits(prev => {
              const updated = prev.map(v => v.id === tempId ? retryData : v);
              saveToLocalCache(currentDate, updated);
              return updated;
            });
            return retryData.id;
          }
        } else {
          console.error('Error adding visit to DB:', error);
          fetchVisits(currentDate);
        }
      } else if (data) {
        setVisits(prev => {
          const updated = prev.map(v => v.id === tempId ? data : v);
          saveToLocalCache(currentDate, updated);
          return updated;
        });
        return data.id;
      }
    }

    return tempId;
  }, [currentDate, fetchVisits]);

  const updateVisit = useCallback(async (id: string, updates: Partial<PatientVisit>) => {
    // Optimistic Update (즉시 UI 반영)
    setVisits(prev => {
      const updated = prev.map(v => v.id === id ? { ...v, ...updates } : v);
      saveToLocalCache(currentDate, updated);
      return updated;
    });

    // DB Sync (디바운스 — 같은 visit에 300ms 내 연속 업데이트 시 병합 후 전송)
    if (isOnlineMode() && supabase) {
      const prevPending = pendingUpdates.current.get(id) || {};
      pendingUpdates.current.set(id, { ...prevPending, ...updates });

      const existing = dbWriteTimers.current.get(id);
      if (existing) clearTimeout(existing);

      dbWriteTimers.current.set(id, setTimeout(async () => {
        dbWriteTimers.current.delete(id);
        const merged = pendingUpdates.current.get(id);
        pendingUpdates.current.delete(id);
        if (!merged) return;

        const { error } = await supabase!
          .from('patient_visits')
          .update({ ...merged, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          console.error('Error updating visit:', error);
          fetchVisits(currentDate);
        }
      }, DB_WRITE_DEBOUNCE));
    }
  }, [currentDate, fetchVisits]);

  const deleteVisit = useCallback(async (id: string) => {
    // 진행 중인 디바운스 취소
    const existing = dbWriteTimers.current.get(id);
    if (existing) {
      clearTimeout(existing);
      dbWriteTimers.current.delete(id);
      pendingUpdates.current.delete(id);
    }

    setVisits(prev => {
      const updated = prev.filter(v => v.id !== id);
      saveToLocalCache(currentDate, updated);
      return updated;
    });

    if (isOnlineMode() && supabase) {
      const { error } = await supabase
        .from('patient_visits')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting visit:', error);
        fetchVisits(currentDate);
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
    setVisits,
    isLoading,
    addVisit,
    updateVisit,
    deleteVisit,
    changeDate
  };
};
