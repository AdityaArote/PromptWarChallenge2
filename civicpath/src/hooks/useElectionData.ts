// src/hooks/useElectionData.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ElectionPhase, VoterType } from "@/types";

export function useElectionData(voterType: VoterType | null) {
  const [phases, setPhases] = useState<ElectionPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!voterType) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchPhases() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("election_phases")
        .select("id, phase_order, title, description, icon, deadline_days_before_election, voter_types")
        .contains("voter_types", [voterType])
        .order("phase_order", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setPhases((data as ElectionPhase[]) ?? []);
      }
      setLoading(false);
    }

    void fetchPhases();
    return () => { cancelled = true; };
  }, [voterType]);

  return { phases, loading, error };
}
