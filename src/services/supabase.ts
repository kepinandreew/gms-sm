import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const supabaseUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL) || ''
).trim();
const supabaseAnonKey = (
  (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    : process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY) || ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface AuthState {
  user: User | { id: string; email: string; user_metadata?: any } | null;
  session: Session | { user: { id: string; email: string } } | null;
  isAuthenticated: boolean;
}

export async function getCurrentSession(): Promise<AuthState> {
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session && data.session.user) {
        return {
          user: data.session.user,
          session: data.session,
          isAuthenticated: true,
        };
      }
    } catch (e) {
      console.warn('Supabase auth getSession error:', e);
    }
  }

  return { user: null, session: null, isAuthenticated: false };
}

export async function loginWithEmail(email: string, password?: string): Promise<{ ok: boolean; user?: any; error?: string }> {
  if (!supabase) {
    return { ok: false, error: 'Koneksi Supabase belum terkonfigurasi.' };
  }

  if (!password) {
    return { ok: false, error: 'Masukkan kata sandi.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data.session && data.user) {
      return { ok: true, user: data.user };
    }

    return { ok: false, error: 'Gagal membuka sesi login.' };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Terjadi kesalahan otentikasi.' };
  }
}

export async function logoutUser(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
  }
}

/**
 * Cloud Synchronization helpers
 */

export interface SupabaseOpResult {
  success: boolean;
  error?: string;
}

export function resolveTableName(tableName: string): string {
  if (tableName === 'settings') return 'engine_settings';
  if (tableName === 'members') return 'team_members';
  if (tableName === 'availability') return 'team_availability';
  return tableName;
}

export function logCrudOperation(params: {
  table: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  rows: number;
  success: boolean;
  error?: any;
}) {
  console.log(`[CRUD LOG] TABLE: ${params.table} | ACTION: ${params.action} | ROWS: ${params.rows} | SUCCESS: ${params.success} | ERROR: ${params.error ? (typeof params.error === 'object' ? JSON.stringify(params.error) : params.error) : 'null'}`);
  console.log('TABLE:', params.table);
  console.log('ACTION:', params.action);
  console.log('ROWS:', params.rows);
  console.log('SUCCESS:', params.success);
  console.log('ERROR:', params.error ?? null);
}

export async function pushTableToSupabase(tableName: string, records: any[]): Promise<SupabaseOpResult> {
  if (!supabase) return { success: false, error: 'Supabase client belum terkonfigurasi.' };
  const targetTable = resolveTableName(tableName);

  try {
    if (records.length === 0) {
      logCrudOperation({ table: targetTable, action: 'UPDATE', rows: 0, success: true, error: null });
      return { success: true };
    }

    const { data, error } = await supabase.from(targetTable).upsert(records, { onConflict: 'id' }).select();

    logCrudOperation({
      table: targetTable,
      action: 'UPDATE',
      rows: data ? data.length : records.length,
      success: !error,
      error: error ? error.message : null,
    });

    if (error) {
      console.error(`[Supabase Push Error - ${targetTable}]:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    logCrudOperation({
      table: targetTable,
      action: 'UPDATE',
      rows: records.length,
      success: false,
      error: e?.message || String(e),
    });
    console.error(`[Supabase Push Exception - ${targetTable}]:`, e);
    return { success: false, error: e.message || 'Koneksi database gagal.' };
  }
}

export async function fetchTableFromSupabase(tableName: string): Promise<any[] | null> {
  if (!supabase) return null;
  const targetTable = resolveTableName(tableName);
  try {
    let { data, error } = await supabase.from(targetTable).select('*');
    if (error && targetTable !== tableName) {
      console.warn(`[Fetch ${targetTable} error (${error.message}), retrying original ${tableName}]`);
      const fallback = await supabase.from(tableName).select('*');
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      }
    }

    logCrudOperation({
      table: targetTable,
      action: 'READ',
      rows: data ? data.length : 0,
      success: !error,
      error: error ? error.message : null,
    });

    if (error) {
      console.warn(`[Supabase Fetch Notice - ${targetTable}]:`, error.message);
      return null;
    }
    return data;
  } catch (e: any) {
    logCrudOperation({
      table: targetTable,
      action: 'READ',
      rows: 0,
      success: false,
      error: e?.message || String(e),
    });
    console.warn(`[Supabase Fetch Exception - ${targetTable}]:`, e?.message || e);
    return null;
  }
}

export async function deleteFromSupabase(tableName: string, column: string, value: any): Promise<SupabaseOpResult> {
  if (!supabase) return { success: false, error: 'Supabase client belum terkonfigurasi.' };
  const targetTable = resolveTableName(tableName);
  try {
    const { data, error } = await supabase.from(targetTable).delete().eq(column, value).select();
    logCrudOperation({
      table: targetTable,
      action: 'DELETE',
      rows: data ? data.length : 0,
      success: !error,
      error: error ? error.message : null,
    });
    if (error) {
      console.error(`[Supabase Delete Error - ${targetTable}]:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    logCrudOperation({
      table: targetTable,
      action: 'DELETE',
      rows: 0,
      success: false,
      error: e?.message || String(e),
    });
    console.error(`[Supabase Delete Exception - ${targetTable}]:`, e);
    return { success: false, error: e.message || 'Koneksi database gagal.' };
  }
}

export async function deleteMonthAssignmentsInSupabase(scheduleId: string, monthPrefix: string): Promise<SupabaseOpResult> {
  if (!supabase) return { success: false, error: 'Supabase client belum terkonfigurasi.' };
  try {
    const res1 = await supabase.from('assignments').delete().or(`schedule_id.eq.${scheduleId},weekend_id.gte.${monthPrefix}-01`).select();
    logCrudOperation({ table: 'assignments', action: 'DELETE', rows: res1.data ? res1.data.length : 0, success: !res1.error, error: res1.error?.message });

    const res2 = await supabase.from('schedules').delete().eq('id', scheduleId).select();
    logCrudOperation({ table: 'schedules', action: 'DELETE', rows: res2.data ? res2.data.length : 0, success: !res2.error, error: res2.error?.message });

    if (res1.error || res2.error) {
      return { success: false, error: res1.error?.message || res2.error?.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('[Supabase Delete Month Exception]:', e);
    return { success: false, error: e.message };
  }
}

export async function deleteSDMonthAssignmentsInSupabase(sdScheduleId: string, monthPrefix: string): Promise<SupabaseOpResult> {
  if (!supabase) return { success: false, error: 'Supabase client belum terkonfigurasi.' };
  try {
    const res1 = await supabase.from('sd_assignments').delete().or(`sd_schedule_id.eq.${sdScheduleId},weekend_id.gte.${monthPrefix}-01`).select();
    logCrudOperation({ table: 'sd_assignments', action: 'DELETE', rows: res1.data ? res1.data.length : 0, success: !res1.error, error: res1.error?.message });

    const res2 = await supabase.from('sd_schedules').delete().eq('id', sdScheduleId).select();
    logCrudOperation({ table: 'sd_schedules', action: 'DELETE', rows: res2.data ? res2.data.length : 0, success: !res2.error, error: res2.error?.message });

    if (res1.error || res2.error) {
      return { success: false, error: res1.error?.message || res2.error?.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('[Supabase Delete SD Month Exception]:', e);
    return { success: false, error: e.message };
  }
}

export async function deleteImportBatchFromSupabase(batchId: string, month: number, year: number): Promise<SupabaseOpResult> {
  if (!supabase) return { success: false, error: 'Supabase client belum terkonfigurasi.' };
  try {
    const scheduleId = `sched-${year}-${month}`;

    const res1 = await supabase.from('assignments').delete().eq('schedule_id', scheduleId).select();
    logCrudOperation({ table: 'assignments', action: 'DELETE', rows: res1.data ? res1.data.length : 0, success: !res1.error, error: res1.error?.message });

    const res2 = await supabase.from('schedules').delete().eq('id', scheduleId).select();
    logCrudOperation({ table: 'schedules', action: 'DELETE', rows: res2.data ? res2.data.length : 0, success: !res2.error, error: res2.error?.message });

    const res3 = await supabase.from('composition_history').delete().eq('month', month).eq('year', year).select();
    logCrudOperation({ table: 'composition_history', action: 'DELETE', rows: res3.data ? res3.data.length : 0, success: !res3.error, error: res3.error?.message });

    const res4 = await supabase.from('special_services').delete().eq('month', month).eq('year', year).select();
    logCrudOperation({ table: 'special_services', action: 'DELETE', rows: res4.data ? res4.data.length : 0, success: !res4.error, error: res4.error?.message });

    const res5 = await supabase.from('audit_logs').delete().eq('batch_id', batchId).select();
    logCrudOperation({ table: 'audit_logs', action: 'DELETE', rows: res5.data ? res5.data.length : 0, success: !res5.error, error: res5.error?.message });

    const hasError = res1.error || res2.error || res3.error || res4.error || res5.error;
    return { success: !hasError, error: hasError ? (res1.error || res2.error || res3.error || res4.error || res5.error)?.message : undefined };
  } catch (e: any) {
    console.error('[Supabase Delete Import Batch Exception]:', e);
    return { success: false, error: e.message };
  }
}
