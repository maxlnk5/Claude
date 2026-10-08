import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export const useProfile = () => useLiveQuery(() => db.profile.get('me'), []);
export const useCourses = () => useLiveQuery(() => db.courses.toArray(), []);
export const useRecords = () => useLiveQuery(() => db.records.toArray(), []);
export const useRounds = () =>
  useLiveQuery(() => db.rounds.orderBy('date').reverse().toArray(), []);
export const useActiveRound = () =>
  useLiveQuery(async () => (await db.rounds.where('status').equals('active').first()) ?? null, []);
export const useRound = (id: number | null) =>
  useLiveQuery(async () => (id === null ? null : ((await db.rounds.get(id)) ?? null)), [id]);
