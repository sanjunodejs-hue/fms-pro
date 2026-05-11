import Types "../types/common";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

module {
  public type RevenueReport = {
    totalRevenue : Nat;
    confirmedPayments : [Types.Payment];
    emiRevenue : Nat;
    fullPayRevenue : Nat;
  };

  public type LeadReport = {
    totalLeads : Nat;
    converted : Nat;
    dropped : Nat;
    byStatus : [(Text, Nat)];
  };

  public type EmiReport = {
    totalInstallments : Nat;
    paid : Nat;
    pending : Nat;
    overdue : Nat;
    overdueAmount : Nat;
  };

  public type DashboardStats = {
    totalLeads : Nat;
    convertedStudents : Nat;
    totalRevenue : Nat;
    pendingEmi : Nat;
    overduePayments : Nat;
    recentActivities : [Types.ActivityLog];
    upcomingEmi : [Types.EmiInstallment];
    upcomingFollowUps : [Types.FollowUp];
  };

  public func getRevenueReport(
    payments : Map.Map<Nat, Types.Payment>,
    students : Map.Map<Nat, Types.Student>,
    caller : Principal,
    fromDate : Types.Timestamp,
    toDate : Types.Timestamp,
  ) : RevenueReport {
    let confirmed = payments.values()
      |> _.filter(func(p : Types.Payment) : Bool {
          p.status == #confirmed and p.createdAt >= fromDate and p.createdAt <= toDate
        })
      |> _.toArray();
    var total = 0;
    var emiRev = 0;
    var fullRev = 0;
    for (p in confirmed.values()) {
      total += p.amount;
      switch (students.get(p.studentId)) {
        case (?(s)) {
          switch (s.paymentType) {
            case (#emi) { emiRev += p.amount };
            case (#full) { fullRev += p.amount };
          };
        };
        case null { fullRev += p.amount };
      };
    };
    { totalRevenue = total; confirmedPayments = confirmed; emiRevenue = emiRev; fullPayRevenue = fullRev };
  };

  public func getLeadReport(
    leads : Map.Map<Nat, Types.Lead>,
    caller : Principal,
    fromDate : Types.Timestamp,
    toDate : Types.Timestamp,
  ) : LeadReport {
    let filtered = leads.values()
      |> _.filter(func(l : Types.Lead) : Bool {
          l.createdAt >= fromDate and l.createdAt <= toDate
        })
      |> _.toArray();
    var total = 0;
    var conv = 0;
    var drop = 0;
    var newCount = 0;
    var followCount = 0;
    for (l in filtered.values()) {
      total += 1;
      switch (l.status) {
        case (#converted) { conv += 1 };
        case (#dropped) { drop += 1 };
        case (#new) { newCount += 1 };
        case (#followUp) { followCount += 1 };
      };
    };
    {
      totalLeads = total;
      converted = conv;
      dropped = drop;
      byStatus = [("new", newCount), ("followUp", followCount), ("converted", conv), ("dropped", drop)];
    };
  };

  public func getEmiReport(
    emis : Map.Map<Nat, Types.EmiInstallment>,
    caller : Principal,
    fromDate : Types.Timestamp,
    toDate : Types.Timestamp,
  ) : EmiReport {
    let filtered = emis.values()
      |> _.filter(func(e : Types.EmiInstallment) : Bool {
          e.dueDate >= fromDate and e.dueDate <= toDate
        })
      |> _.toArray();
    var total = 0;
    var paid = 0;
    var pending = 0;
    var overdue = 0;
    var overdueAmt = 0;
    for (e in filtered.values()) {
      total += 1;
      switch (e.status) {
        case (#paid) { paid += 1 };
        case (#pending) { pending += 1 };
        case (#overdue) { overdue += 1; overdueAmt += e.amount };
      };
    };
    { totalInstallments = total; paid; pending; overdue; overdueAmount = overdueAmt };
  };

  public func getDashboardStats(
    leads : Map.Map<Nat, Types.Lead>,
    students : Map.Map<Nat, Types.Student>,
    payments : Map.Map<Nat, Types.Payment>,
    emis : Map.Map<Nat, Types.EmiInstallment>,
    followUps : Map.Map<Nat, Types.FollowUp>,
    logs : Map.Map<Nat, Types.ActivityLog>,
    caller : Principal,
  ) : DashboardStats {
    let now = Time.now();
    let totalLeads = leads.size();
    let convertedStudents = students.size();
    // Total confirmed revenue
    var totalRevenue = 0;
    payments.forEach(func(_, p) {
      if (p.status == #confirmed) { totalRevenue += p.amount };
    });
    // Pending EMI count
    var pendingEmi = 0;
    emis.forEach(func(_, e) {
      if (e.status == #pending or e.status == #overdue) { pendingEmi += 1 };
    });
    // Overdue payments
    var overduePayments = 0;
    emis.forEach(func(_, e) {
      if (e.status == #overdue) { overduePayments += 1 };
    });
    // Recent 10 activity logs (sorted by timestamp desc)
    let allLogs = logs.values()
      |> _.toArray();
    let sortedLogs = allLogs.sort(func(a : Types.ActivityLog, b : Types.ActivityLog) : { #less; #equal; #greater } {
      if (a.timestamp > b.timestamp) { #less }
      else if (a.timestamp < b.timestamp) { #greater }
      else { #equal };
    });
    let recentActivities = sortedLogs.sliceToArray(0, Nat.min(10, sortedLogs.size()));
    // Upcoming 5 EMI installments (pending, future due dates)
    let upcomingEmiArr = emis.values()
      |> _.filter(func(e : Types.EmiInstallment) : Bool { e.status == #pending and e.dueDate > now })
      |> _.toArray();
    let sortedEmi = upcomingEmiArr.sort(func(a : Types.EmiInstallment, b : Types.EmiInstallment) : { #less; #equal; #greater } {
      if (a.dueDate < b.dueDate) { #less }
      else if (a.dueDate > b.dueDate) { #greater }
      else { #equal };
    });
    let upcomingEmi = sortedEmi.sliceToArray(0, Nat.min(5, sortedEmi.size()));
    // Upcoming 5 follow-ups
    let upcomingFuArr = followUps.values()
      |> _.filter(func(f : Types.FollowUp) : Bool { f.nextFollowUpDate > now })
      |> _.toArray();
    let sortedFu = upcomingFuArr.sort(func(a : Types.FollowUp, b : Types.FollowUp) : { #less; #equal; #greater } {
      if (a.nextFollowUpDate < b.nextFollowUpDate) { #less }
      else if (a.nextFollowUpDate > b.nextFollowUpDate) { #greater }
      else { #equal };
    });
    let upcomingFollowUps = sortedFu.sliceToArray(0, Nat.min(5, sortedFu.size()));
    {
      totalLeads;
      convertedStudents;
      totalRevenue;
      pendingEmi;
      overduePayments;
      recentActivities;
      upcomingEmi;
      upcomingFollowUps;
    };
  };
}
