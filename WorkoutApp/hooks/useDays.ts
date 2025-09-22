import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Day } from '../lib/types';

export default function useDays() {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(false);
  const [exerciseCounts, setExerciseCounts] = useState<Record<string, number>>({});

  const fetchDays = useCallback(async (userId?: string | null) => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('days')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setDays(data as Day[]);
        const dayIds = (data as Day[]).map(d => d.id);
        if (dayIds.length > 0) {
          const { data: exData } = await supabase
            .from('exercises')
            .select('id, day_id')
            .in('day_id', dayIds as string[]);
          const counts: Record<string, number> = {};
          (exData || []).forEach((e: { day_id: string }) => {
            counts[e.day_id] = (counts[e.day_id] || 0) + 1;
          });
          setExerciseCounts(counts);
        } else {
          setExerciseCounts({});
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createDay = useCallback(async (name: string, userId?: string | null) => {
    const { data, error } = await supabase.from('days').insert({ name, user_id: userId }).select();
    if (error) throw error;
    const created = data && data.length > 0 ? (data[0] as Day) : null;
    if (created && userId) await fetchDays(userId);
    return created;
  }, [fetchDays]);

  const updateDay = useCallback(async (id: string, name: string, userId?: string | null) => {
    const { error } = await supabase.from('days').update({ name }).eq('id', id);
    if (error) throw error;
    if (userId) await fetchDays(userId);
    return true;
  }, [fetchDays]);

  const deleteDay = useCallback(async (id: string, userId?: string | null) => {
    // delete exercises then day
    const { error: err1 } = await supabase.from('exercises').delete().eq('day_id', id);
    if (err1) throw err1;
    const { error: err2 } = await supabase.from('days').delete().eq('id', id);
    if (err2) throw err2;
    if (userId) await fetchDays(userId);
    return true;
  }, [fetchDays]);

  return {
    days,
    loading,
    exerciseCounts,
    fetchDays,
    createDay,
    updateDay,
    deleteDay,
  } as const;
}
