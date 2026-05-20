import { create } from 'zustand';

/**
 * Provider-side jobs cache.
 *
 * The provider dashboard fetches `bookings` joined with `user_profiles`
 * (full_name, phone, home_area, email). The job-detail screen needs that
 * same customer information, but the GET-by-id endpoint has historically
 * dropped the join. We cache the list-view payload here so the detail
 * screen can render customer name / address / phone instantly and survive
 * a missing join in the detail response.
 *
 * The store is intentionally schema-loose (`ProviderJob` mirrors what the
 * backend returns) so any future fields flow through without code changes.
 */

export interface ProviderJobCustomer {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  home_area?: string | null;
}

export interface ProviderJob {
  id: string;
  user_id?: string;
  provider_id?: string;
  user_request?: string;
  status?: string;
  scheduled_time?: string;
  price?: number;
  created_at?: string;
  user_profiles?: ProviderJobCustomer | null;
  // Allow extra fields without forcing every consumer to widen the type.
  [key: string]: unknown;
}

interface ProviderJobsState {
  jobs: ProviderJob[];
  byId: Record<string, ProviderJob>;

  /** Replace the list (called after a successful dashboard fetch). */
  setJobs: (jobs: ProviderJob[]) => void;

  /**
   * Upsert one job. Existing cached fields win over `undefined`/`null`
   * coming from the new payload — this is what lets the cached
   * `user_profiles` survive a detail response that forgot the join.
   */
  upsertJob: (job: ProviderJob) => void;

  /** Read a cached job by id (or undefined). */
  getJob: (id: string) => ProviderJob | undefined;

  /** Clear everything (called on logout / provider-mode switch). */
  clear: () => void;
}

function mergePreferDefined(
  prev: ProviderJob | undefined,
  next: ProviderJob,
): ProviderJob {
  if (!prev) return next;
  const merged: ProviderJob = { ...prev };
  for (const [key, value] of Object.entries(next)) {
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }
  // Customer details: merge field-by-field so a fresh `full_name` doesn't
  // wipe a previously-cached `phone` when the new payload omits it.
  const prevCustomer = prev.user_profiles ?? null;
  const nextCustomer = next.user_profiles ?? null;
  if (prevCustomer || nextCustomer) {
    merged.user_profiles = {
      ...(prevCustomer ?? {}),
      ...Object.fromEntries(
        Object.entries(nextCustomer ?? {}).filter(
          ([, v]) => v !== undefined && v !== null,
        ),
      ),
    };
  }
  return merged;
}

export const useProviderJobsStore = create<ProviderJobsState>((set, get) => ({
  jobs: [],
  byId: {},

  setJobs: (jobs) => {
    const byId = jobs.reduce<Record<string, ProviderJob>>((acc, j) => {
      acc[j.id] = mergePreferDefined(get().byId[j.id], j);
      return acc;
    }, {});
    set({ jobs, byId });
  },

  upsertJob: (job) => {
    const prev = get().byId[job.id];
    const next = mergePreferDefined(prev, job);
    set((state) => ({
      byId: { ...state.byId, [job.id]: next },
      jobs: state.jobs.some((j) => j.id === job.id)
        ? state.jobs.map((j) => (j.id === job.id ? next : j))
        : [next, ...state.jobs],
    }));
  },

  getJob: (id) => get().byId[id],

  clear: () => set({ jobs: [], byId: {} }),
}));
