import { useEffect, useCallback } from 'react';
import { Preset } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { supabase, isOnlineMode } from '../lib/supabase';
import { DEFAULT_PRESETS } from '../constants';

const PRESET_DEFAULTS_STORAGE_KEY = 'physio-presets-default-v1';

const readPresetDefaults = (): Preset[] => {
  if (typeof window === 'undefined') return DEFAULT_PRESETS;
  try {
    const raw = window.localStorage.getItem(PRESET_DEFAULTS_STORAGE_KEY);
    if (!raw || raw === 'undefined' || raw === 'null' || raw.trim() === '') {
      return DEFAULT_PRESETS;
    }
    return JSON.parse(raw) as Preset[];
  } catch {
    return DEFAULT_PRESETS;
  }
};

const writePresetDefaults = (presets: Preset[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRESET_DEFAULTS_STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.warn('Failed to persist preset defaults:', error);
  }
};

export const usePresetManager = () => {
  // Local storage is the source of truth for immediate UI and offline capability
  const [presets, setLocalPresets] = useLocalStorage<Preset[]>('physio-presets-v1', readPresetDefaults());

  useEffect(() => {
    if (!Array.isArray(presets)) return;
    writePresetDefaults(presets);
  }, [presets]);

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
            steps: row.steps,
            color: row.color,
            textColor: row.text_color,
          }));

          // DB 스키마에 색상 컬럼이 없거나 누락된 경우를 대비해
          // 로컬에 저장된 프리셋 색상/글자색을 보존한다.
          setLocalPresets((prev) => dbPresets.map((preset) => {
            if (preset.color && preset.textColor) return preset;
            const local = Array.isArray(prev) ? prev.find((item) => item.id === preset.id) : undefined;
            return {
              ...preset,
              color: preset.color || local?.color,
              textColor: preset.textColor || local?.textColor,
            };
          }));
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
    writePresetDefaults(newPresets);

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
