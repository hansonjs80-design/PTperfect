import { useEffect, useCallback } from 'react';
import { QuickTreatment } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { supabase, isOnlineMode } from '../lib/supabase';
import { STANDARD_TREATMENTS } from '../constants';

export const useQuickTreatmentManager = () => {
  // Local storage is the source of truth for immediate UI and offline capability
  const [quickTreatments, setLocalQuickTreatments] = useLocalStorage<QuickTreatment[]>('physio-quick-treatments-v1', STANDARD_TREATMENTS);

  // Sync from DB on mount and subscribe to changes
  useEffect(() => {
    const client = supabase;
    if (!isOnlineMode() || !client) return;

    const fetchQuickTreatments = async () => {
      const { data, error } = await client
        .from('quick_treatments')
        .select('*')
        .order('rank', { ascending: true });

      if (data && !error) {
        if (data.length > 0) {
           const dbItems: QuickTreatment[] = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            label: row.label,
            duration: row.duration,
            color: row.color,
            enableTimer: row.enable_timer,
            rank: row.rank
          }));
          setLocalQuickTreatments(dbItems);
        } else {
           // If DB is explicitly empty, reflect that locally
           setLocalQuickTreatments([]);
        }
      } 
    };

    fetchQuickTreatments();
    
    const channel = client
      .channel('public:quick_treatments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_treatments' }, () => {
        fetchQuickTreatments();
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, []);

  const updateQuickTreatments = useCallback(async (newItems: QuickTreatment[]) => {
    // 1. Optimistic Update
    setLocalQuickTreatments(newItems);

    // 2. DB Sync
    const client = supabase;
    if (isOnlineMode() && client) {
      try {
        const { data: existingRows, error: fetchError } = await client.from('quick_treatments').select('id');
        
        if (fetchError) {
            console.error('Error fetching quick treatments for sync:', fetchError);
            return;
        }

        if (existingRows) {
          const newIds = new Set(newItems.map(p => p.id));
          const dbIds = existingRows.map(r => r.id);
          const idsToDelete = dbIds.filter(id => !newIds.has(id));
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await client.from('quick_treatments').delete().in('id', idsToDelete);
            if (deleteError) console.error('Error deleting quick treatments:', deleteError);
          }
        }

        if (newItems.length > 0) {
          const rowsToUpsert = newItems.map((p, idx) => ({
            id: p.id,
            name: p.name,
            label: p.label,
            duration: p.duration,
            color: p.color,
            enable_timer: p.enableTimer,
            rank: idx,
            updated_at: new Date().toISOString()
          }));

          const { error: upsertError } = await client.from('quick_treatments').upsert(rowsToUpsert);
          if (upsertError) console.error("Error upserting quick treatments:", upsertError);
        }

      } catch (err) {
        console.error("Unexpected error during quick treatment sync:", err);
      }
    }
  }, [setLocalQuickTreatments]); 

  return { quickTreatments, updateQuickTreatments };
};