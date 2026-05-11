import Types "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import LogsLib "logs";
import EmiLib "emi";
import Nat "mo:core/Nat";

module {
  public func addLead(
    leads : Map.Map<Nat, Types.Lead>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    name : Text,
    email : Text,
    phone : Text,
    courseId : Nat,
    source : Text,
    notes : Text,
    state : Types.AppState,
  ) : Types.Result<Types.Lead, Text> {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return #err("User not found") };
    };
    if (callerProfile.role != #admin and callerProfile.role != #teamHead) {
      return #err("Unauthorized");
    };
    let teamId : ?Nat = switch (callerProfile.role) {
      case (#teamHead) { callerProfile.teamId };
      case _ { null };
    };
    state.nextLeadId += 1;
    let id = state.nextLeadId;
    let now = Time.now();
    let lead : Types.Lead = {
      id; name; email; phone; courseId;
      teamId;
      assignedTo = null;
      status = #new;
      source; notes;
      createdBy = caller;
      createdAt = now;
      updatedAt = now;
    };
    leads.add(id, lead);
    #ok(lead);
  };

  public func getLeads(
    leads : Map.Map<Nat, Types.Lead>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : [Types.Lead] {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return [] };
    };
    leads.values()
      |> _.filter(func(l : Types.Lead) : Bool {
          switch (callerProfile.role) {
            case (#admin) { true };
            case (#teamHead) {
              switch (callerProfile.teamId) {
                case (?(tid)) { l.teamId == ?(tid) };
                case null { false };
              };
            };
            case (#counselor) { l.assignedTo == ?(caller) };
            case (#accountant) { true };
          };
        })
      |> _.toArray();
  };

  public func getLead(
    leads : Map.Map<Nat, Types.Lead>,
    id : Nat,
  ) : ?Types.Lead {
    leads.get(id);
  };

  public func updateLead(
    leads : Map.Map<Nat, Types.Lead>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
    name : Text,
    email : Text,
    phone : Text,
    courseId : Nat,
    source : Text,
    notes : Text,
  ) : Types.Result<Types.Lead, Text> {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return #err("User not found") };
    };
    switch (leads.get(id)) {
      case (?(lead)) {
        // Counselors cannot update courseId (keep existing)
        let newCourseId = if (callerProfile.role == #counselor) { lead.courseId } else { courseId };
        let updated = { lead with name; email; phone; courseId = newCourseId; source; notes; updatedAt = Time.now() };
        leads.add(id, updated);
        #ok(updated);
      };
      case null { #err("Lead not found") };
    };
  };

  public func deleteLead(
    leads : Map.Map<Nat, Types.Lead>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
  ) : Types.Result<Bool, Text> {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return #err("User not found") };
    };
    if (callerProfile.role != #admin and callerProfile.role != #teamHead) {
      return #err("Unauthorized");
    };
    leads.remove(id);
    #ok(true);
  };

  public func assignLead(
    leads : Map.Map<Nat, Types.Lead>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    leadId : Nat,
    teamId : Nat,
    counselorId : Principal,
  ) : Types.Result<Types.Lead, Text> {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return #err("User not found") };
    };
    if (callerProfile.role != #admin and callerProfile.role != #teamHead) {
      return #err("Unauthorized");
    };
    switch (leads.get(leadId)) {
      case (?(lead)) {
        let updated = { lead with teamId = ?(teamId); assignedTo = ?(counselorId); updatedAt = Time.now() };
        leads.add(leadId, updated);
        #ok(updated);
      };
      case null { #err("Lead not found") };
    };
  };

  public func transferLead(
    leads : Map.Map<Nat, Types.Lead>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    leadId : Nat,
    newTeamId : Nat,
    newCounselorId : Principal,
  ) : Types.Result<Types.Lead, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    switch (leads.get(leadId)) {
      case (?(lead)) {
        let updated = { lead with teamId = ?(newTeamId); assignedTo = ?(newCounselorId); updatedAt = Time.now() };
        leads.add(leadId, updated);
        #ok(updated);
      };
      case null { #err("Lead not found") };
    };
  };

  public func updateLeadStatus(
    leads : Map.Map<Nat, Types.Lead>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    leadId : Nat,
    status : Types.LeadStatus,
  ) : Types.Result<Types.Lead, Text> {
    switch (users.get(caller)) {
      case (?(u)) { ignore u };
      case null { return #err("User not found") };
    };
    switch (leads.get(leadId)) {
      case (?(lead)) {
        let updated = { lead with status; updatedAt = Time.now() };
        leads.add(leadId, updated);
        #ok(updated);
      };
      case null { #err("Lead not found") };
    };
  };

  public func convertToStudent(
    leads : Map.Map<Nat, Types.Lead>,
    students : Map.Map<Nat, Types.Student>,
    courses : Map.Map<Nat, Types.Course>,
    emis : Map.Map<Nat, Types.EmiInstallment>,
    users : Map.Map<Principal, Types.UserProfile>,
    logs : Map.Map<Nat, Types.ActivityLog>,
    caller : Principal,
    leadId : Nat,
    paymentType : Types.PaymentType,
    emiMonths : ?Nat,
    state : Types.AppState,
  ) : Types.Result<Types.Student, Text> {
    switch (users.get(caller)) {
      case (?(u)) { ignore u };
      case null { return #err("User not found") };
    };
    let lead = switch (leads.get(leadId)) {
      case (?(l)) { l };
      case null { return #err("Lead not found") };
    };
    let course = switch (courses.get(lead.courseId)) {
      case (?(c)) { c };
      case null { return #err("Course not found") };
    };
    state.nextStudentId += 1;
    let studentId = state.nextStudentId;
    let now = Time.now();
    let student : Types.Student = {
      id = studentId;
      leadId = ?(leadId);
      name = lead.name;
      email = lead.email;
      phone = lead.phone;
      courseId = lead.courseId;
      teamId = lead.teamId;
      assignedCounselor = lead.assignedTo;
      paymentType;
      totalFee = course.totalFee;
      paidAmount = 0;
      status = #active;
      enrolledAt = now;
    };
    students.add(studentId, student);
    // Mark lead as converted
    let updatedLead = { lead with status = #converted; updatedAt = now };
    leads.add(leadId, updatedLead);
    // Generate EMI plan if paymentType is #emi
    switch (paymentType) {
      case (#emi) {
        let months = switch (emiMonths) { case (?(m)) { m }; case null { 3 } };
        ignore EmiLib.generatePlan(emis, studentId, course.totalFee, months, now, state);
        // TODO: send email via extension — subject: "EMI Plan Generated", body: "Dear " # lead.name # ", your EMI plan of " # Nat.toText(months) # " installments has been created. Amount per installment: " # Nat.toText(course.totalFee / months);
      };
      case (#full) {
        // TODO: send email via extension — subject: "Full Payment Due", body: "Dear " # lead.name # ", please complete your full payment of " # Nat.toText(course.totalFee) # " for course: " # course.name;
      };
    };
    LogsLib.log(logs, caller, "convertToStudent", "lead", ?(leadId), "Lead converted to student ID: " # studentId.toText(), state);
    #ok(student);
  };
}
