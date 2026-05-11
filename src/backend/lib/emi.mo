import Types "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";

module {
  // 30 days in nanoseconds
  let thirtyDaysNs : Int = 2_592_000_000_000_000;

  public func getInstallments(
    emis : Map.Map<Nat, Types.EmiInstallment>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    studentId : ?Nat,
  ) : [Types.EmiInstallment] {
    switch (users.get(caller)) {
      case null { return [] };
      case (?(u)) { ignore u };
    };
    emis.values()
      |> _.filter(func(e : Types.EmiInstallment) : Bool {
          switch (studentId) {
            case (?(sid)) { e.studentId == sid };
            case null { true };
          };
        })
      |> _.toArray();
  };

  public func generatePlan(
    emis : Map.Map<Nat, Types.EmiInstallment>,
    studentId : Nat,
    totalFee : Nat,
    months : Nat,
    startDate : Types.Timestamp,
    state : Types.AppState,
  ) : [Types.EmiInstallment] {
    if (months == 0) { return [] };
    let baseAmount = totalFee / months;
    let remainder = totalFee % months;
    Nat.range(1, months + 1).map<Nat, Types.EmiInstallment>(func(i) {
      state.nextEmiId += 1;
      let id = state.nextEmiId;
      let amount = if (i == months) { baseAmount + remainder } else { baseAmount };
      let dueDate : Types.Timestamp = startDate + (thirtyDaysNs * i.toInt());
      let inst : Types.EmiInstallment = {
        id;
        studentId;
        installmentNumber = i;
        amount;
        dueDate;
        paidDate = null;
        status = #pending;
        paymentId = null;
      };
      emis.add(id, inst);
      inst;
    }).toArray();
  };

  public func markPaid(
    emis : Map.Map<Nat, Types.EmiInstallment>,
    students : Map.Map<Nat, Types.Student>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    installmentId : Nat,
    paymentId : ?Nat,
  ) : Types.Result<Types.EmiInstallment, Text> {
    switch (users.get(caller)) {
      case null { return #err("User not found") };
      case (?(u)) { ignore u };
    };
    switch (emis.get(installmentId)) {
      case (?(inst)) {
        let updated = { inst with status = #paid; paidDate = ?(Time.now()); paymentId };
        emis.add(installmentId, updated);
        // Update student paidAmount
        switch (students.get(inst.studentId)) {
          case (?(s)) {
            let newPaid = s.paidAmount + inst.amount;
            students.add(inst.studentId, { s with paidAmount = newPaid });
          };
          case null {};
        };
        // TODO: send email via extension — subject: "EMI Payment Confirmed", body: "Dear student, installment #" # Nat.toText(inst.installmentNumber) # " of amount " # Nat.toText(inst.amount) # " has been marked as paid.";
        #ok(updated);
      };
      case null { #err("Installment not found") };
    };
  };

  public func sendReminder(
    emis : Map.Map<Nat, Types.EmiInstallment>,
    students : Map.Map<Nat, Types.Student>,
    _settings : Types.AppSettings,
    _caller : Principal,
    installmentId : Nat,
  ) : Types.Result<Bool, Text> {
    switch (emis.get(installmentId)) {
      case (?(inst)) {
        switch (students.get(inst.studentId)) {
          case (_s) {
            // TODO: send email via extension — subject: "EMI Reminder"
            // TODO: send WhatsApp via extension
            // TODO: send SMS via extension
          };
        };
        #ok(true);
      };
      case null { #err("Installment not found") };
    };
  };

  public func updateOverdue(
    emis : Map.Map<Nat, Types.EmiInstallment>,
  ) {
    let now = Time.now();
    emis.forEach(func(id, inst) {
      if (inst.status == #pending and inst.dueDate < now) {
        let updated = { inst with status = #overdue };
        emis.add(id, updated);
      };
    });
  };
}
