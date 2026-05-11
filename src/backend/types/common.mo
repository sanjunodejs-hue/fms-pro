import Map "mo:core/Map";
import List "mo:core/List";

module {
  public type UserId = Principal;
  public type Timestamp = Int;
  public type Result<T, E> = { #ok : T; #err : E };

  public type Role = {
    #admin;
    #teamHead;
    #counselor;
    #accountant;
  };

  public type UserProfile = {
    id : UserId;
    name : Text;
    email : Text;
    role : Role;
    teamId : ?Nat;
    createdAt : Timestamp;
  };

  public type CourseCategory = {
    id : Nat;
    name : Text;
    description : Text;
    createdBy : UserId;
  };

  public type Course = {
    id : Nat;
    name : Text;
    categoryId : Nat;
    totalFee : Nat;
    duration : Text;
    emiOptions : [Nat];
    description : Text;
    isActive : Bool;
  };

  public type LeadStatus = {
    #new;
    #followUp;
    #converted;
    #dropped;
  };

  public type Lead = {
    id : Nat;
    name : Text;
    email : Text;
    phone : Text;
    courseId : Nat;
    teamId : ?Nat;
    assignedTo : ?UserId;
    status : LeadStatus;
    source : Text;
    notes : Text;
    createdBy : UserId;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  public type FollowUp = {
    id : Nat;
    leadId : Nat;
    notes : Text;
    nextFollowUpDate : Timestamp;
    reminderDate : ?Timestamp;
    createdBy : UserId;
    createdAt : Timestamp;
  };

  public type PaymentType = { #full; #emi };

  public type StudentStatus = { #active; #inactive; #completed };

  public type Student = {
    id : Nat;
    leadId : ?Nat;
    name : Text;
    email : Text;
    phone : Text;
    courseId : Nat;
    teamId : ?Nat;
    assignedCounselor : ?UserId;
    paymentType : PaymentType;
    totalFee : Nat;
    paidAmount : Nat;
    status : StudentStatus;
    enrolledAt : Timestamp;
  };

  public type EmiStatus = { #pending; #paid; #overdue };

  public type EmiInstallment = {
    id : Nat;
    studentId : Nat;
    installmentNumber : Nat;
    amount : Nat;
    dueDate : Timestamp;
    paidDate : ?Timestamp;
    status : EmiStatus;
    paymentId : ?Nat;
  };

  public type PaymentMethod = { #cash; #bankTransfer; #online };

  public type PaymentStatus = { #pending; #confirmed; #rejected };

  public type Payment = {
    id : Nat;
    studentId : Nat;
    amount : Nat;
    method : PaymentMethod;
    transactionId : ?Text;
    status : PaymentStatus;
    paymentLink : ?Text;
    createdBy : UserId;
    confirmedBy : ?UserId;
    createdAt : Timestamp;
    confirmedAt : ?Timestamp;
  };

  public type Receipt = {
    id : Nat;
    paymentId : Nat;
    studentId : Nat;
    receiptNumber : Text;
    amount : Nat;
    generatedAt : Timestamp;
    generatedBy : UserId;
  };

  public type ReminderTargetType = { #emi; #followUp; #payment };

  public type ReminderRecipientType = { #student; #counselor; #teamHead; #admin; #all };

  public type ReminderStatus = { #pending; #sent; #failed };

  public type Reminder = {
    id : Nat;
    targetType : ReminderTargetType;
    targetId : Nat;
    recipientType : ReminderRecipientType;
    message : Text;
    scheduledAt : Timestamp;
    sentAt : ?Timestamp;
    status : ReminderStatus;
  };

  public type Team = {
    id : Nat;
    name : Text;
    categoryId : ?Nat;
    headId : ?UserId;
    description : Text;
    isActive : Bool;
    createdAt : Timestamp;
  };

  public type ActivityLog = {
    id : Nat;
    userId : UserId;
    action : Text;
    entityType : Text;
    entityId : ?Nat;
    details : Text;
    timestamp : Timestamp;
  };

  public type AppSettings = {
    companyName : Text;
    companyEmail : Text;
    companyPhone : Text;
    logoUrl : Text;
    paymentBaseUrl : Text;
    smtpHost : Text;
    smtpPort : Nat;
    smtpUser : Text;
    whatsappApiKey : Text;
    smsApiKey : Text;
  };

  // Internal mutable state containers (not shared across API boundary)
  public type AppState = {
    var nextUserId : Nat;
    var nextCategoryId : Nat;
    var nextCourseId : Nat;
    var nextLeadId : Nat;
    var nextFollowUpId : Nat;
    var nextStudentId : Nat;
    var nextEmiId : Nat;
    var nextPaymentId : Nat;
    var nextReceiptId : Nat;
    var nextReminderId : Nat;
    var nextTeamId : Nat;
    var nextLogId : Nat;
  };
}
