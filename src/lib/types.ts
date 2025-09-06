// Common types for the application

export type RoleEnum =
  | "Super Admin"
  | "Admin"
  | "Dispatcher"
  | "Driver"
  | "Volunteer"
  | "Client";

export type RideType = "Medical" | "Tax" | "Shopping" | "Social" | "Other";
export type RideStatus = "Pending" | "Assigned" | "In Progress" | "Completed" | "Cancelled";
export type TimeOffReason = "Medical" | "Vacation" | "Emergency" | "Personal" | "Other";
export type TimeOffStatus = "Pending" | "Approved" | "Denied";
export type DonationType = "Cash" | "Check" | "Online" | "Other";
export type ReportType = "Appointments" | "Assigned Rides" | "Donations" | "Driver Performance" | "Client Usage" | "Financial";

export interface User {
	id: string;
	email: string;
	name: string;
  role: RoleEnum;
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  user_id: string;
  org_id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  primary_phone: string;
  secondary_phone?: string;
  contact_pref: "Phone" | "Email" | "Text";
  gender: "Male" | "Female" | "Other";
  street_address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  lives_alone: boolean;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  role: RoleEnum;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  org_id: number;
  name: string;
  logo_url?: string;
  head_admin_id: string;
  street_address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Ride {
  ride_id: number;
  client_id: string;
  driver_id?: string;
  dispatcher_id?: string;
  org_id: number;
  ride_type: RideType;
  pickup_address: string;
  pickup_address2?: string;
  pickup_city: string;
  pickup_state: string;
  pickup_zip: string;
  dropoff_address: string;
  dropoff_address2?: string;
  dropoff_city: string;
  dropoff_state: string;
  dropoff_zip: string;
  scheduled_date: Date;
  scheduled_time: string;
  is_one_way: boolean;
  is_recurring: boolean;
  recurring_pattern?: string;
  status: RideStatus;
  notes?: string;
  special_requirements?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DriverAvailability {
  availability_id: number;
  driver_id: string;
  date: Date;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TimeOffRequest {
  request_id: number;
  driver_id: string;
  reason: TimeOffReason;
  start_date: Date;
  end_date: Date;
  status: TimeOffStatus;
  notes?: string;
  approved_by?: string;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Donation {
  donation_id: number;
  ride_id?: number;
  client_id: string;
  donation_type: DonationType;
  amount?: number;
  received: boolean;
  received_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Report {
  report_id: number;
  org_id: number;
  report_type: ReportType;
  date_range_start: Date;
  date_range_end: Date;
  filters?: Record<string, any>;
  generated_by: string;
  generated_at: Date;
  report_data?: Record<string, any>;
  file_url?: string;
}

export interface AuditLog {
  log_id: number;
  user_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  status: "SUCCESS" | "FAILED";
  created_at: Date;
}

export interface SystemConfig {
  config_id: number;
  org_id?: number;
  config_key: string;
  config_value?: string;
  config_type: "string" | "number" | "boolean" | "json";
  description?: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserRole {
  user_id: string;
  role_id: number;
}

export interface Role {
  role_id: number;
  name: RoleEnum;
}

export interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  roles: RoleEnum[];
  badge?: string;
  children?: NavigationItem[];
}

export interface AuthInfo {
  token?: string;
  user?: any;
}

export interface Todo {
	id: string;
	title: string;
	description?: string;
	completed: boolean;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

export interface ApiResponse<T> {
	data: T;
	message?: string;
	success: boolean;
}

export interface ApiErrorData {
	message: string;
	status: number;
	code?: string;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterData {
	email: string;
	password: string;
	name: string;
}

export interface PaginationParams {
	page: number;
	limit: number;
	sort?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}
