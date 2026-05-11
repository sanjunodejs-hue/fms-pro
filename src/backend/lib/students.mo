import Types "../types/common";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public func getStudents(
    students : Map.Map<Nat, Types.Student>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : [Types.Student] {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return [] };
    };
    students.values()
      |> _.filter(func(s : Types.Student) : Bool {
          switch (callerProfile.role) {
            case (#admin) { true };
            case (#accountant) { true };
            case (#teamHead) {
              switch (callerProfile.teamId) {
                case (?(tid)) { s.teamId == ?(tid) };
                case null { false };
              };
            };
            case (#counselor) { s.assignedCounselor == ?(caller) };
          };
        })
      |> _.toArray();
  };

  public func getStudent(
    students : Map.Map<Nat, Types.Student>,
    id : Nat,
  ) : ?Types.Student {
    students.get(id);
  };

  public func updateStudent(
    students : Map.Map<Nat, Types.Student>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
    name : Text,
    email : Text,
    phone : Text,
  ) : Types.Result<Types.Student, Text> {
    switch (users.get(caller)) {
      case (?(u)) { ignore u };
      case null { return #err("User not found") };
    };
    switch (students.get(id)) {
      case (?(s)) {
        let updated = { s with name; email; phone };
        students.add(id, updated);
        #ok(updated);
      };
      case null { #err("Student not found") };
    };
  };

  public func deleteStudent(
    students : Map.Map<Nat, Types.Student>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
  ) : Types.Result<Bool, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    students.remove(id);
    #ok(true);
  };

  public func assignCourse(
    students : Map.Map<Nat, Types.Student>,
    courses : Map.Map<Nat, Types.Course>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    studentId : Nat,
    courseId : Nat,
  ) : Types.Result<Types.Student, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    let course = switch (courses.get(courseId)) {
      case (?(c)) { c };
      case null { return #err("Course not found") };
    };
    switch (students.get(studentId)) {
      case (?(s)) {
        let updated = { s with courseId; totalFee = course.totalFee };
        students.add(studentId, updated);
        #ok(updated);
      };
      case null { #err("Student not found") };
    };
  };
}
