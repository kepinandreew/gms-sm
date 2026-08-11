/**
 * GMS Service Team Scheduler - Global Types
 */

export type TeamStatus = 'active' | 'inactive';

export interface Team {
  id: string;
  team_number: number;
  name: string;
  leader_name?: string;
  status: TeamStatus;
  notes?: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  name: string;
  role: 'Leader' | 'Member' | 'Co-Leader' | string;
  status: 'active' | 'inactive' | 'cuti';
  joined_at: string;
  left_at?: string;
  notes?: string;
}

export interface LeaderHistory {
  id: string;
  team_id: string;
  leader_name: string;
  period_start: string; // e.g. "2026-03"
  period_end?: string; // e.g. "2026-07" or "Present"
}

export interface TeamCompositionHistory {
  id: string;
  team_id: string;
  month: number;
  year: number;
  leader_name: string;
  members: string[];
  source_file?: string;
}

export type SpecialServiceStatus = 'draft' | 'active' | 'cancelled' | 'completed' | 'archived';
export type AssignmentMode = 'auto' | 'pre_assign';

export interface SpecialServiceSlot {
  id: string;
  slot_name: string; // e.g. "Service 1", "Night Service"
  start_time: string; // e.g. "16:00"
  end_time?: string; // e.g. "18:00"
  teams_required: number;
  assigned_team_ids: string[];
}

export interface SpecialService {
  id: string;
  event_name: string; // e.g. "Christmas Celebration", "Revival Night"
  date: string; // YYYY-MM-DD
  location_type: 'existing' | 'custom';
  location_id?: 'barat' | 'timur' | 'selatan' | 'pusura' | 'english';
  custom_location_name?: string;
  notes?: string;
  status: SpecialServiceStatus;
  assignment_mode: AssignmentMode;
  is_locked: boolean;
  countsAsServiceAssignment?: boolean; // Default false. If true, counts towards OFF weekend.
  offImpact?: 'NONE' | 'CURRENT_SERVICE_WEEKEND' | 'NEXT_SERVICE_WEEKEND'; // Default NONE
  slots: SpecialServiceSlot[];
  month: number;
  year: number;
  created_at: string;
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ParsedAssignmentPreview {
  id: string;
  date: string; // YYYY-MM-DD
  day_name?: string; // e.g. "Minggu", "Sabtu"
  team_number: number;
  team_id?: string;
  location_name: string;
  location_id: 'barat' | 'timur' | 'selatan' | 'pusura' | 'english';
  slot_name: string;
  slot_id: string;
  service_type: 'REGULAR' | 'SPECIAL';
  confidence: ConfidenceLevel;
  leader_name?: string;
  members?: string[];
  warnings: string[];
  is_duplicate?: boolean;
  source_file_id?: string;
  source_filename?: string;
  batch_id?: string;
  detected_month?: number;
  detected_year?: number;
  detected_text?: string;
  source_page?: number;
}

export interface ParsedTeamStructure {
  team_number: number;
  leader: string;
  members: string[];
  effective_month: string;
  confidence?: ConfidenceLevel;
  warnings?: string[];
}

export interface MonthConflictOption {
  month: number;
  year: number;
  label: string;
  reason: string;
}

export interface PdfImportSummary {
  id: string;
  batch_id: string;
  file_name: string;
  file_size?: number;
  month_label: string;
  month: number;
  year: number;
  total_assignments: number;
  total_teams: number;
  special_services_count: number;
  warnings_count: number;
  confidence_score: number;
  assignments: ParsedAssignmentPreview[];
  team_structures: ParsedTeamStructure[];
  special_services: SpecialService[];
  status: 'uploading' | 'parsing' | 'ready_for_review' | 'confirmed' | 'failed';
  error_message?: string;
  raw_pdf_data_url?: string;
  raw_extracted_text?: string;
  has_month_conflict?: boolean;
  conflict_options?: MonthConflictOption[];
  imported_at?: string;
}

export interface ImportAuditLog {
  id: string;
  batch_id: string;
  imported_file: string;
  import_date: string;
  imported_by: string;
  number_of_assignments: number;
  number_of_teams: number;
  warnings_count: number;
  corrections_made: number;
  status: string;
  month: number;
  year: number;
}

export type DayOfWeek = 'SATURDAY' | 'SUNDAY';

export interface ServiceLocation {
  id: 'barat' | 'timur' | 'selatan' | 'pusura' | 'english';
  name: string;
  day: DayOfWeek;
  color: string; // Tailwind accent color class or hex
}

export interface ServiceSlot {
  id: string;
  location_id: 'barat' | 'timur' | 'selatan' | 'pusura' | 'english';
  name: string; // e.g., 'U1', 'U2-U3', 'U4-U5', 'U1-U2', 'U3-U4', 'English Service'
  day: DayOfWeek;
  start_times: string[]; // e.g. ['07:00'] or ['10:00', '13:00']
  required_teams: number; // always 1 per slot
}

export interface ServiceWeekend {
  id: string; // e.g. '2026-08-08' (using Saturday date)
  saturday_date: string; // YYYY-MM-DD
  sunday_date: string; // YYYY-MM-DD
  label: string; // e.g. "Aug 8-9, 2026"
  weekend_number: number; // 1, 2, 3, 4, or 5 in month
  month: number; // 1-12
  year: number; // e.g. 2026
}

export type ScheduleStatus = 'draft' | 'generated' | 'finalized';

export interface Assignment {
  id: string;
  schedule_id: string;
  weekend_id: string; // matches ServiceWeekend.id
  service_date: string; // YYYY-MM-DD (Saturday for English, Sunday for others)
  team_id: string;
  location_id: 'barat' | 'timur' | 'selatan' | 'pusura' | 'english';
  slot_id: string; // ServiceSlot.id
  locked: boolean;
  manually_assigned: boolean;
}

export interface Schedule {
  id: string;
  month: number; // 1 - 12
  year: number; // e.g. 2026
  status: ScheduleStatus;
  created_at: string;
  finalized_at?: string;
  quality_score: number; // 0 - 100
  fairness_metrics: {
    monthly_balance_score: number;
    longterm_balance_score: number;
    location_rotation_score: number;
    slot_rotation_score: number;
    date_distribution_score: number;
    total_assignments: number;
    active_teams_count: number;
    min_services_per_team: number;
    max_services_per_team: number;
    avg_services_per_team: number;
  };
}

export interface TeamAvailability {
  id: string;
  team_id: string;
  weekend_date: string; // Saturday date YYYY-MM-DD of the service weekend
  available: boolean; // false = unavailable
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SchedulerSettings {
  weight_monthly_balance: number; // default 50
  weight_longterm_balance: number; // default 20
  weight_location_rotation: number; // default 15
  weight_slot_rotation: number; // default 10
  weight_date_distribution: number; // default 5
}

export type ValidationSeverity = 'HARD_CONFLICT' | 'WARNING' | 'VALID';

export interface ValidationResult {
  severity: ValidationSeverity;
  message: string;
  details?: string[];
}

export interface ExplanationDetails {
  team_name: string;
  location_name: string;
  slot_name: string;
  monthly_count: number;
  monthly_target: number;
  total_lifetime_services: number;
  recent_location_history: { location: string; count: number }[];
  recent_slot_history: { slot: string; count: number }[];
  explanation_text: string;
  score_breakdown: {
    monthly_urgency: number;
    longterm_urgency: number;
    location_fit: number;
    slot_fit: number;
    total_score: number;
  };
}

/**
 * SERVICE DIRECTOR (SD) TYPES & DATA MODEL
 */

export type SDStatus = 'active' | 'inactive' | 'cuti';

export interface SDRule {
  allowed_locations?: ('barat' | 'timur' | 'selatan' | 'pusura')[];
  blocked_locations?: ('barat' | 'timur' | 'selatan' | 'pusura')[];
  allowed_days?: DayOfWeek[];
  allowed_services?: ('Service U1' | 'Service U2-U3' | 'Service U4-U5')[];
  allowed_slots?: string[]; // e.g. ["barat-u1", "timur-u1", "U1"]
  blocked_slots?: string[];
  notes?: string;
}

export interface SDRequestPlaceholder {
  id: string;
  sd_id: string;
  type: 'PREFER_SERVICE' | 'UNAVAILABLE' | 'PREFER_LOCATION' | 'OTHER';
  date?: string;
  preferred_location?: 'barat' | 'timur' | 'selatan' | 'pusura' | 'english';
  preferred_slot?: string;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface SDVacationPeriod {
  id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason?: string;
}

export interface ServiceDirector {
  id: string;
  name: string;
  status: SDStatus;
  phone?: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  special_rules?: SDRule;

  // Extensible Future Architecture Fields
  preferred_date?: string;
  preferred_weekend?: number;
  preferred_service?: string;
  preferred_location?: 'barat' | 'timur' | 'selatan' | 'pusura' | 'english';
  unavailable_dates?: string[];
  vacation?: SDVacationPeriod[];
  recurring_availability?: string;
  max_services_per_month?: number;
  max_consecutive_weeks?: number;
  certification?: string;
  qualification?: string;
  requests?: SDRequestPlaceholder[];
}

export interface SDAssignment {
  id: string;
  sd_schedule_id: string;
  weekend_id: string; // matches ServiceWeekend.id or date string
  service_date: string; // YYYY-MM-DD
  sd_id: string; // ID of ServiceDirector
  location_id: 'barat' | 'timur' | 'selatan' | 'pusura' | 'english';
  slot_id: string;
  locked: boolean;
  manually_assigned: boolean;
  is_special_service?: boolean;
  special_service_id?: string;
}

export interface SDSchedule {
  id: string;
  month: number;
  year: number;
  status: ScheduleStatus;
  created_at: string;
  finalized_at?: string;
  notes?: string;
}

export interface SDHistoryItem {
  id: string;
  sd_id: string;
  month: number;
  year: number;
  location_id: string;
  location_name: string;
  slot_name: string;
  service_date: string;
  weekend_number: number;
}

