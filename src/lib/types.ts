// Common types for the application

export type RoleEnum =
  | "Super Admin"
  | "Admin"
  | "Dispatcher"
  | "Driver"
  | "Volunteer"
  | "Client";

export interface User {
  id: string;
  email: string;
  name: string;
  role: RoleEnum;
  createdAt: Date;
  updatedAt: Date;
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
  street_address: string;
  address2?: string;
  city: string;
  state: string;
  zip_code: string;
  lives_alone: boolean;
}

export interface Organization {
  org_id: number;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
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
