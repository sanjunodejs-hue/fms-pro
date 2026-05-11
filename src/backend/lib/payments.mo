import Types "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import ReceiptsLib "receipts";

module {
  func getDefaultSettings() : Types.AppSettings {
    {
      companyName = "FMS";
      companyEmail = "";
      companyPhone = "";
      logoUrl = "";
      paymentBaseUrl = "https://pay.example.com";
      smtpHost = "";
      smtpPort = 587;
      smtpUser = "";
      whatsappApiKey = "";
      smsApiKey = "";
    };
  };

  func resolveSettings(settingsStore : Map.Map<Text, Types.AppSettings>) : Types.AppSettings {
    switch (settingsStore.get("main")) {
      case (?(s)) { s };
      case null { getDefaultSettings() };
    };
  };

  public func addPayment(
    payments : Map.Map<Nat, Types.Payment>,
    students : Map.Map<Nat, Types.Student>,
    users : Map.Map<Principal, Types.UserProfile>,
    settingsStore : Map.Map<Text, Types.AppSettings>,
    caller : Principal,
    studentId : Nat,
    amount : Nat,
    method : Types.PaymentMethod,
    transactionId : ?Text,
    state : Types.AppState,
  ) : Types.Result<Types.Payment, Text> {
    switch (users.get(caller)) {
      case null { return #err("User not found") };
      case (?(u)) { ignore u };
    };
    switch (students.get(studentId)) {
      case null { return #err("Student not found") };
      case (?(s)) { ignore s };
    };
    state.nextPaymentId += 1;
    let id = state.nextPaymentId;
    let settings = resolveSettings(settingsStore);
    let link = settings.paymentBaseUrl # "/pay/" # id.toText();
    let payment : Types.Payment = {
      id;
      studentId;
      amount;
      method;
      transactionId;
      status = #pending;
      paymentLink = ?(link);
      createdBy = caller;
      confirmedBy = null;
      createdAt = Time.now();
      confirmedAt = null;
    };
    payments.add(id, payment);
    #ok(payment);
  };

  public func getPayments(
    payments : Map.Map<Nat, Types.Payment>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    studentId : ?Nat,
  ) : [Types.Payment] {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return [] };
    };
    payments.values()
      |> _.filter(func(p : Types.Payment) : Bool {
          let matchesStudent = switch (studentId) {
            case (?(sid)) { p.studentId == sid };
            case null { true };
          };
          let hasAccess = switch (callerProfile.role) {
            case (#admin) { true };
            case (#accountant) { true };
            case _ { p.createdBy == caller };
          };
          matchesStudent and hasAccess;
        })
      |> _.toArray();
  };

  public func getPayment(
    payments : Map.Map<Nat, Types.Payment>,
    id : Nat,
  ) : ?Types.Payment {
    payments.get(id);
  };

  public func confirmPayment(
    payments : Map.Map<Nat, Types.Payment>,
    students : Map.Map<Nat, Types.Student>,
    receipts : Map.Map<Nat, Types.Receipt>,
    users : Map.Map<Principal, Types.UserProfile>,
    settingsStore : Map.Map<Text, Types.AppSettings>,
    caller : Principal,
    paymentId : Nat,
    state : Types.AppState,
  ) : Types.Result<Types.Payment, Text> {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return #err("User not found") };
    };
    if (callerProfile.role != #accountant and callerProfile.role != #admin) {
      return #err("Unauthorized: only accountant or admin can confirm payments");
    };
    let payment = switch (payments.get(paymentId)) {
      case (?(p)) { p };
      case null { return #err("Payment not found") };
    };
    let now = Time.now();
    let confirmed = { payment with status = #confirmed; confirmedBy = ?(caller); confirmedAt = ?(now) };
    payments.add(paymentId, confirmed);
    // Update student paidAmount
    switch (students.get(payment.studentId)) {
      case (?(s)) {
        students.add(payment.studentId, { s with paidAmount = s.paidAmount + payment.amount });
      };
      case null {};
    };
    // Auto-generate receipt
    let settings = resolveSettings(settingsStore);
    ignore ReceiptsLib.generateReceipt(receipts, paymentId, payment.studentId, payment.amount, caller, now, settings, state);
    // TODO: send email via extension — subject: "Payment Confirmed", to: student.email, body: "Dear student, your payment of " # Nat.toText(payment.amount) # " has been confirmed. Receipt is attached.";
    // TODO: send WhatsApp via extension — payment confirmation with receipt link
    #ok(confirmed);
  };

  public func generatePaymentLink(
    payments : Map.Map<Nat, Types.Payment>,
    students : Map.Map<Nat, Types.Student>,
    users : Map.Map<Principal, Types.UserProfile>,
    settingsStore : Map.Map<Text, Types.AppSettings>,
    caller : Principal,
    studentId : Nat,
    amount : Nat,
    state : Types.AppState,
  ) : Types.Result<Text, Text> {
    switch (users.get(caller)) {
      case null { return #err("User not found") };
      case (?(u)) { ignore u };
    };
    switch (students.get(studentId)) {
      case null { return #err("Student not found") };
      case (?(s)) { ignore s };
    };
    state.nextPaymentId += 1;
    let id = state.nextPaymentId;
    let settings = resolveSettings(settingsStore);
    let link = settings.paymentBaseUrl # "/pay/" # id.toText();
    let payment : Types.Payment = {
      id;
      studentId;
      amount;
      method = #online;
      transactionId = null;
      status = #pending;
      paymentLink = ?(link);
      createdBy = caller;
      confirmedBy = null;
      createdAt = Time.now();
      confirmedAt = null;
    };
    payments.add(id, payment);
    #ok(link);
  };

  public func deletePayment(
    payments : Map.Map<Nat, Types.Payment>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
  ) : Types.Result<Bool, Text> {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return #err("User not found") };
    };
    if (callerProfile.role != #admin and callerProfile.role != #accountant) {
      return #err("Unauthorized");
    };
    switch (payments.get(id)) {
      case (?(p)) {
        if (p.status != #pending) { return #err("Can only delete pending payments") };
        payments.remove(id);
        #ok(true);
      };
      case null { #err("Payment not found") };
    };
  };
}
