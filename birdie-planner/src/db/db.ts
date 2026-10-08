import Dexie, { type Table } from 'dexie';
import type { Course, Profile, Round, ScoringRecordEntry } from '../lib/types';

export class BirdieDB extends Dexie {
  profile!: Table<Profile, 'me'>;
  courses!: Table<Course, number>;
  rounds!: Table<Round, number>;
  records!: Table<ScoringRecordEntry, number>;

  constructor(name = 'birdie-planner') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      courses: '++id, name',
      rounds: '++id, date, status, courseId',
      records: '++id, date, origin',
    });
  }
}

export const db = new BirdieDB();
