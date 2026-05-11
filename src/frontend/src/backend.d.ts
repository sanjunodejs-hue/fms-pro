import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export type Result_2 = {
    __kind__: "ok";
    ok: Student;
} | {
    __kind__: "err";
    err: string;
};
export type Result_5 = {
    __kind__: "ok";
    ok: FollowUp;
} | {
    __kind__: "err";
    err: string;
};
export type Result_1 = {
    __kind__: "ok";
    ok: Team;
} | {
    __kind__: "err";
    err: string;
};
export interface RevenueReport {
    emiRevenue: bigint;
    fullPayRevenue: bigint;
    confirmedPayments: Array<Payment>;
    totalRevenue: bigint;
}
export type Result_4 = {
    __kind__: "ok";
    ok: Lead;
} | {
    __kind__: "err";
    err: string;
};
export type Result_11 = {
    __kind__: "ok";
    ok: Payment;
} | {
    __kind__: "err";
    err: string;
};
export interface Receipt {
    id: bigint;
    studentId: bigint;
    generatedAt: Timestamp;
    generatedBy: UserId;
    paymentId: bigint;
    amount: bigint;
    receiptNumber: string;
}
export interface Reminder {
    id: bigint;
    status: ReminderStatus;
    sentAt?: Timestamp;
    message: string;
    targetType: ReminderTargetType;
    targetId: bigint;
    recipientType: ReminderRecipientType;
    scheduledAt: Timestamp;
}
export interface LeadReport {
    dropped: bigint;
    totalLeads: bigint;
    byStatus: Array<[string, bigint]>;
    converted: bigint;
}
export interface Lead {
    id: bigint;
    status: LeadStatus;
    assignedTo?: UserId;
    source: string;
    name: string;
    createdAt: Timestamp;
    createdBy: UserId;
    email: string;
    updatedAt: Timestamp;
    notes: string;
    phone: string;
    teamId?: bigint;
    courseId: bigint;
}
export interface Course {
    id: bigint;
    categoryId: bigint;
    duration: string;
    name: string;
    description: string;
    isActive: boolean;
    totalFee: bigint;
    emiOptions: Array<bigint>;
}
export type Result_7 = {
    __kind__: "ok";
    ok: Course;
} | {
    __kind__: "err";
    err: string;
};
export interface EmiInstallment {
    id: bigint;
    status: EmiStatus;
    studentId: bigint;
    installmentNumber: bigint;
    dueDate: Timestamp;
    paidDate?: Timestamp;
    paymentId?: bigint;
    amount: bigint;
}
export interface Student {
    id: bigint;
    status: StudentStatus;
    name: string;
    email: string;
    totalFee: bigint;
    leadId?: bigint;
    assignedCounselor?: UserId;
    enrolledAt: Timestamp;
    paymentType: PaymentType;
    phone: string;
    teamId?: bigint;
    paidAmount: bigint;
    courseId: bigint;
}
export interface Team {
    id: bigint;
    categoryId?: bigint;
    name: string;
    createdAt: Timestamp;
    description: string;
    isActive: boolean;
    headId?: UserId;
}
export type Result_6 = {
    __kind__: "ok";
    ok: CourseCategory;
} | {
    __kind__: "err";
    err: string;
};
export interface CourseCategory {
    id: bigint;
    name: string;
    createdBy: UserId;
    description: string;
}
export interface ActivityLog {
    id: bigint;
    action: string;
    userId: UserId;
    entityId?: bigint;
    timestamp: Timestamp;
    details: string;
    entityType: string;
}
export type Result_12 = {
    __kind__: "ok";
    ok: Reminder;
} | {
    __kind__: "err";
    err: string;
};
export type Result_9 = {
    __kind__: "ok";
    ok: EmiInstallment;
} | {
    __kind__: "err";
    err: string;
};
export interface Payment {
    id: bigint;
    status: PaymentStatus;
    method: PaymentMethod;
    studentId: bigint;
    createdAt: Timestamp;
    createdBy: UserId;
    confirmedAt?: Timestamp;
    confirmedBy?: UserId;
    paymentLink?: string;
    amount: bigint;
    transactionId?: string;
}
export interface DashboardStats {
    convertedStudents: bigint;
    recentActivities: Array<ActivityLog>;
    totalLeads: bigint;
    overduePayments: bigint;
    upcomingEmi: Array<EmiInstallment>;
    pendingEmi: bigint;
    totalRevenue: bigint;
    upcomingFollowUps: Array<FollowUp>;
}
export interface AppSettings {
    companyEmail: string;
    whatsappApiKey: string;
    smtpHost: string;
    smtpPort: bigint;
    smtpUser: string;
    logoUrl: string;
    smsApiKey: string;
    companyName: string;
    companyPhone: string;
    paymentBaseUrl: string;
}
export type UserId = Principal;
export type Result = {
    __kind__: "ok";
    ok: UserProfile;
} | {
    __kind__: "err";
    err: string;
};
export type Result_3 = {
    __kind__: "ok";
    ok: AppSettings;
} | {
    __kind__: "err";
    err: string;
};
export type Result_10 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export type Result_8 = {
    __kind__: "ok";
    ok: boolean;
} | {
    __kind__: "err";
    err: string;
};
export interface FollowUp {
    id: bigint;
    createdAt: Timestamp;
    createdBy: UserId;
    reminderDate?: Timestamp;
    leadId: bigint;
    notes: string;
    nextFollowUpDate: Timestamp;
}
export interface UserProfile {
    id: UserId;
    name: string;
    createdAt: Timestamp;
    role: Role;
    email: string;
    teamId?: bigint;
}
export interface EmiReport {
    overdueAmount: bigint;
    pending: bigint;
    paid: bigint;
    overdue: bigint;
    totalInstallments: bigint;
}
export enum EmiStatus {
    pending = "pending",
    paid = "paid",
    overdue = "overdue"
}
export enum LeadStatus {
    new_ = "new",
    dropped = "dropped",
    followUp = "followUp",
    converted = "converted"
}
export enum PaymentMethod {
    cash = "cash",
    bankTransfer = "bankTransfer",
    online = "online"
}
export enum PaymentStatus {
    pending = "pending",
    rejected = "rejected",
    confirmed = "confirmed"
}
export enum PaymentType {
    emi = "emi",
    full = "full"
}
export enum ReminderRecipientType {
    all = "all",
    teamHead = "teamHead",
    admin = "admin",
    student = "student",
    counselor = "counselor"
}
export enum ReminderStatus {
    pending = "pending",
    sent = "sent",
    failed = "failed"
}
export enum ReminderTargetType {
    emi = "emi",
    followUp = "followUp",
    payment = "payment"
}
export enum Role {
    accountant = "accountant",
    teamHead = "teamHead",
    admin = "admin",
    counselor = "counselor"
}
export enum StudentStatus {
    active = "active",
    completed = "completed",
    inactive = "inactive"
}
export interface backendInterface {
    addCourse(name: string, categoryId: bigint, totalFee: bigint, duration: string, emiOptions: Array<bigint>, description: string): Promise<Result_7>;
    addCourseCategory(name: string, description: string): Promise<Result_6>;
    addFollowUp(leadId: bigint, notes: string, nextFollowUpDate: Timestamp, reminderDate: Timestamp | null): Promise<Result_5>;
    addLead(name: string, email: string, phone: string, courseId: bigint, source: string, notes: string): Promise<Result_4>;
    addPayment(studentId: bigint, amount: bigint, method: PaymentMethod, transactionId: string | null): Promise<Result_11>;
    addReminder(targetType: ReminderTargetType, targetId: bigint, message: string, scheduledAt: Timestamp): Promise<Result_12>;
    addTeam(name: string, categoryId: bigint | null, description: string): Promise<Result_1>;
    assignCourse(studentId: bigint, courseId: bigint): Promise<Result_2>;
    assignLead(leadId: bigint, teamId: bigint, counselorId: Principal): Promise<Result_4>;
    assignTeamHead(teamId: bigint, headId: Principal): Promise<Result_1>;
    confirmPayment(paymentId: bigint): Promise<Result_11>;
    convertLeadToStudent(leadId: bigint, paymentType: PaymentType, emiMonths: bigint | null): Promise<Result_2>;
    deleteCourse(id: bigint): Promise<Result_8>;
    deleteCourseCategory(id: bigint): Promise<Result_8>;
    deleteFollowUp(id: bigint): Promise<Result_8>;
    deleteLead(id: bigint): Promise<Result_8>;
    deletePayment(id: bigint): Promise<Result_8>;
    deleteReminder(id: bigint): Promise<Result_8>;
    deleteStudent(id: bigint): Promise<Result_8>;
    deleteTeam(id: bigint): Promise<Result_8>;
    deleteUser(userId: Principal): Promise<Result_8>;
    generatePaymentLink(studentId: bigint, amount: bigint): Promise<Result_10>;
    getActivityLogs(limit: bigint | null, offset: bigint | null): Promise<Array<ActivityLog>>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getCourse(id: bigint): Promise<Course | null>;
    getCourseCategories(): Promise<Array<CourseCategory>>;
    getCourses(): Promise<Array<Course>>;
    getDashboardStats(): Promise<DashboardStats>;
    getEmiInstallments(studentId: bigint | null): Promise<Array<EmiInstallment>>;
    getEmiReport(fromDate: Timestamp, toDate: Timestamp): Promise<EmiReport>;
    getFollowUps(leadId: bigint | null): Promise<Array<FollowUp>>;
    getLead(id: bigint): Promise<Lead | null>;
    getLeadReport(fromDate: Timestamp, toDate: Timestamp): Promise<LeadReport>;
    getLeads(): Promise<Array<Lead>>;
    getPayment(id: bigint): Promise<Payment | null>;
    getPayments(studentId: bigint | null): Promise<Array<Payment>>;
    getReceipt(id: bigint): Promise<Receipt | null>;
    getReceipts(studentId: bigint | null): Promise<Array<Receipt>>;
    getReminders(): Promise<Array<Reminder>>;
    getRevenueReport(fromDate: Timestamp, toDate: Timestamp): Promise<RevenueReport>;
    getSettings(): Promise<AppSettings>;
    getStudent(id: bigint): Promise<Student | null>;
    getStudents(): Promise<Array<Student>>;
    getTeam(id: bigint): Promise<Team | null>;
    getTeams(): Promise<Array<Team>>;
    getUserProfile(): Promise<UserProfile | null>;
    markEmiPaid(installmentId: bigint, paymentId: bigint | null): Promise<Result_9>;
    sendEmiReminder(installmentId: bigint): Promise<Result_8>;
    setUserProfile(name: string, email: string): Promise<Result>;
    transferLead(leadId: bigint, newTeamId: bigint, newCounselorId: Principal): Promise<Result_4>;
    updateCourse(id: bigint, name: string, categoryId: bigint, totalFee: bigint, duration: string, emiOptions: Array<bigint>, description: string, isActive: boolean): Promise<Result_7>;
    updateCourseCategory(id: bigint, name: string, description: string): Promise<Result_6>;
    updateFollowUp(id: bigint, notes: string, nextFollowUpDate: Timestamp, reminderDate: Timestamp | null): Promise<Result_5>;
    updateLead(id: bigint, name: string, email: string, phone: string, courseId: bigint, source: string, notes: string): Promise<Result_4>;
    updateLeadStatus(leadId: bigint, status: LeadStatus): Promise<Result_4>;
    updateSettings(settings: AppSettings): Promise<Result_3>;
    updateStudent(id: bigint, name: string, email: string, phone: string): Promise<Result_2>;
    updateTeam(id: bigint, name: string, categoryId: bigint | null, headId: Principal | null, description: string): Promise<Result_1>;
    updateUserRole(userId: Principal, role: Role): Promise<Result>;
}
