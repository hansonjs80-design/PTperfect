import { useEffect, useCallback } from 'react';
import { Preset } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { supabase, isOnlineMode } from '../lib/supabase';
import { DEFAULT_PRESETS } from '../constants';

export const usePresetManager = () => {
  // Local storage is the source of truth for immediate UI and offline capability
  const [presets, setLocalPresets] = useLocalStorage<Preset[]>('physio-presets-v1', DEFAULT_PRESETS);

  // Sync from DB on mount and subscribe to changes
  useEffect(() => {
    // Local capture to satisfy TypeScript null checks
    const client = supabase;
    if (!isOnlineMode() || !client) return;

    const fetchPresets = async () => {
      const { data, error } = await client
        .from('presets')
        .select('*')
        .order('rank', { ascending: true });

      if (data && !error) {
        // If DB has data, use it. 
        // If DB is empty, we do NOTHING. We do NOT auto-seed here anymore.
        // This prevents the bug where deleting all presets causes them to resurrect.
        // The SQL script now handles initial seeding for fresh installs.
        if (data.length > 0) {
           const dbPresets: Preset[] = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            steps: row.steps
          }));
          setLocalPresets(dbPresets);
        } else {
           // If DB is explicitly empty (e.g. user deleted all), reflect that locally
           setLocalPresets([]);
        }
      } 
    };

    fetchPresets();
    
    // Subscribe to changes (for multi-device sync)
    const channel = client
      .channel('public:presets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presets' }, () => {
        // When DB changes, re-fetch to ensure order and full data integrity
        fetchPresets();
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, []); // Run once on mount

  // The main update function exposed to the app
  const updatePresets = useCallback(async (newPresets: Preset[]) => {
    // 1. Optimistic Update (Immediate UI response)
    setLocalPresets(newPresets);

    // 2. DB Sync
    // Local capture not needed here strictly if we check supabase directly in condition,
    // but useful for consistent typing.
    const client = supabase;
    if (isOnlineMode() && client) {
      try {
        // Sync Strategy: 
        // A. Get current DB IDs to identify deletions.
        const { data: existingRows, error: fetchError } = await client.from('presets').select('id');
        
        if (fetchError) {
            console.error('Error fetching presets for sync:', fetchError);
            return;
        }

        if (existingRows) {
          const newIds = new Set(newPresets.map(p => p.id));
          const dbIds = existingRows.map(r => r.id);
          const idsToDelete = dbIds.filter(id => !newIds.has(id));
          
          // B. Delete removed items
          if (idsToDelete.length > 0) {
            console.log('Attempting to delete presets:', idsToDelete);
            const { error: deleteError } = await client.from('presets').delete().in('id', idsToDelete);
            if (deleteError) {
                console.error('Error deleting presets:', deleteError);
                // We might want to alert the user here, but mostly we just log it.
                // If this fails, the next fetch/refresh will restore the item, indicating permission issue.
            } else {
                console.log('Successfully deleted presets.');
            }
          }
        }

        // C. Upsert the new/modified items with rank (to preserve order)
        if (newPresets.length > 0) {
          const rowsToUpsert = newPresets.map((p, idx) => ({
            id: p.id,
            name: p.name,
            steps: p.steps,
            rank: idx,
            updated_at: new Date().toISOString()
          }));

          const { error: upsertError } = await client.from('presets').upsert(rowsToUpsert);
          if (upsertError) {
              console.error("Error upserting presets:", upsertError);
          }
        }

      } catch (err) {
        console.error("Unexpected error during preset sync:", err);
      }
    }
  }, [setLocalPresets]); 

  return { presets, updatePresets };
};