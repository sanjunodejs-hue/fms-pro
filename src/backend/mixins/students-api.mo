import Types "../types/common";
import StudentsLib "../lib/students";
import Map "mo:core/Map";

mixin (
  students : Map.Map<Nat, Types.Student>,
  courses : Map.Map<Nat, Types.Course>,
  users : Map.Map<Principal, Types.UserProfile>,
  state : Types.AppState,
) {
  public shared query ({ caller }) func getStudents() : async [Types.Student] {
    StudentsLib.getStudents(students, users, caller);
  };

  public shared query ({ caller }) func getStudent(id : Nat) : async ?Types.Student {
    StudentsLib.getStudent(students, id);
  };

  public shared ({ caller }) func updateStudent(
    id : Nat,
    name : Text,
    email : Text,
    phone : Text,
  ) : async Types.Result<Types.Student, Text> {
    StudentsLib.updateStudent(students, users, caller, id, name, email, phone);
  };

  public shared ({ caller }) func deleteStudent(id : Nat) : async Types.Result<Bool, Text> {
    StudentsLib.deleteStudent(students, users, caller, id);
  };

  public shared ({ caller }) func assignCourse(studentId : Nat, courseId : Nat) : async Types.Result<Types.Student, Text> {
    StudentsLib.assignCourse(students, courses, users, caller, studentId, courseId);
  };
}
