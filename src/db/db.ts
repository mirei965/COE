import Dexie, { type Table } from 'dexie';
import { schemaMap } from '@/lib/schemas';

// 設定・プロフィール
export interface Settings {
  key: string; 
  value: unknown;
}

// 毎日のベースログ
export interface DayLog {
  id: string; // 'YYYY-MM-DD'
  sleepStart?: Date;
  sleepEnd?: Date;
  sleepQuality?: number; // 1-5
  morningArousal?: number; // 1-5
  migraineProdrome?: number; // 0-3
  isMenstruation?: boolean;
  todayMode?: 'normal' | 'eco' | 'rest';
  
  dayOverall?: 'good' | 'fair' | 'bad';
  dinnerAmount?: 'light' | 'medium' | 'heavy';
  bestMeasure?: string;
  note?: string;
  
  echoSummary?: string;
  createdAt: number;
  updatedAt: number;
}

// 瞬間イベント（日中スタンプ）
export interface EventLog {
  id?: number;
  date: string; // 'YYYY-MM-DD'
  type: 'symptom' | 'medicine' | 'trigger' | 'food';
  name: string;
  severity: number;
  timestamp: number;
  note?: string;
}

// レジメン履歴（減薬管理）
export interface RegimenHistory {
  id?: number;
  startDate: string;
  type: 'maintenance' | 'tapering' | 'titration';
  description: string;
  isActive: boolean;
  createdAt: number;
}

export interface Clinic {
  id?: number;
  name: string;
  department?: string;
}

export interface ClinicVisit {
  id?: number;
  date: string;
  clinicId: number;
  note?: string;
  isCompleted: boolean;
  time?: string;
}

export interface Medicine {
  id?: number;
  name: string;
  dosage: string;
  type: 'regular' | 'prn';
  dailyDose?: string;
  updatedAt: number;
}

export class CoeDatabase extends Dexie {
  dayLogs!: Table<DayLog, string>;
  eventLogs!: Table<EventLog, number>;
  regimenHistory!: Table<RegimenHistory, number>;
  settings!: Table<Settings, string>;
  clinics!: Table<Clinic, number>;
  clinicVisits!: Table<ClinicVisit, number>;
  medicines!: Table<Medicine, number>;

  constructor() {
    super('CoeAppDB');
    this.version(1).stores({
      dayLogs: 'id',
      eventLogs: '++id, date, type',
      regimenHistory: '++id, isActive',
      settings: 'key',
    });
    this.version(2).stores({
      eventLogs: '++id, date, type, timestamp'
    });
    this.version(3).stores({
      clinics: '++id',
      clinicVisits: '++id, date, clinicId, isCompleted'
    });
    this.version(4).stores({
      regimenHistory: '++id, isActive, startDate'
    });
    this.version(5).stores({
      medicines: '++id, name, type'
    });

    // Validation Middleware: Enforce Zod schemas before every write
    this.use({
      stack: 'dbcore',
      name: 'validation',
      create: (downlevelDatabase) => {
        return {
          ...downlevelDatabase,
          table: (tableName) => {
            const downlevelTable = downlevelDatabase.table(tableName);
            const schema = schemaMap[tableName];
            if (!schema) return downlevelTable;

            return {
              ...downlevelTable,
              mutate: async (req) => {
                if (req.type === 'add' || req.type === 'put') {
                  for (const value of req.values) {
                    try {
                      schema.parse(value);
                    } catch (error) {
                      console.error(`Validation Failed for ${tableName}:`, error);
                      // Custom error for easier catch in UI
                      throw new Error(`入力内容の検証に失敗しました (${tableName}): ${error instanceof Error ? error.message : 'Invalid data'}`);
                    }
                  }
                }
                return downlevelTable.mutate.call(downlevelTable, req);
              }
            };
          }
        };
      }
    });
  }
}

export const db = new CoeDatabase();
