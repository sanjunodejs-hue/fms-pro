// Re-export all backend types
export type {
  Role,
  UserProfile,
  CourseCategory,
  Course,
  Lead,
  FollowUp,
  Student,
  EmiInstallment,
  Payment,
  Receipt,
  Reminder,
  Team,
  ActivityLog,
  AppSettings,
  DashboardStats,
  RevenueReport,
  LeadReport,
  EmiReport,
  Timestamp,
  UserId,
} from "../backend";
export {
  EmiStatus,
  LeadStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  ReminderRecipientType,
  ReminderStatus,
  ReminderTargetType,
  StudentStatus,
} from "../backend";

// UI-only helper types
export interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: string[];
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export type StatVariant =
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "indigo";

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; direction: "up" | "down" };
  variant?: StatVariant;
  gradient?: boolean;
}

export type ModalSize = "sm" | "md" | "lg" | "xl";

export type BadgeVariant =
  | "new"
  | "followUp"
  | "converted"
  | "dropped"
  | "pending"
  | "confirmed"
  | "rejected"
  | "paid"
  | "overdue"
  | "active"
  | "inactive"
  | "completed";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}
