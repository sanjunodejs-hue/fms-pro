import Types "../types/common";
import CoursesLib "../lib/courses";
import Map "mo:core/Map";

mixin (
  categories : Map.Map<Nat, Types.CourseCategory>,
  courses : Map.Map<Nat, Types.Course>,
  users : Map.Map<Principal, Types.UserProfile>,
  state : Types.AppState,
) {
  public shared ({ caller }) func addCourseCategory(name : Text, description : Text) : async Types.Result<Types.CourseCategory, Text> {
    CoursesLib.addCategory(categories, users, caller, name, description, state);
  };

  public shared query ({ caller }) func getCourseCategories() : async [Types.CourseCategory] {
    CoursesLib.getCategories(categories);
  };

  public shared ({ caller }) func updateCourseCategory(id : Nat, name : Text, description : Text) : async Types.Result<Types.CourseCategory, Text> {
    CoursesLib.updateCategory(categories, users, caller, id, name, description);
  };

  public shared ({ caller }) func deleteCourseCategory(id : Nat) : async Types.Result<Bool, Text> {
    CoursesLib.deleteCategory(categories, users, caller, id);
  };

  public shared ({ caller }) func addCourse(
    name : Text,
    categoryId : Nat,
    totalFee : Nat,
    duration : Text,
    emiOptions : [Nat],
    description : Text,
  ) : async Types.Result<Types.Course, Text> {
    CoursesLib.addCourse(courses, users, caller, name, categoryId, totalFee, duration, emiOptions, description, state);
  };

  public shared query ({ caller }) func getCourses() : async [Types.Course] {
    CoursesLib.getCourses(courses);
  };

  public shared query ({ caller }) func getCourse(id : Nat) : async ?Types.Course {
    CoursesLib.getCourse(courses, id);
  };

  public shared ({ caller }) func updateCourse(
    id : Nat,
    name : Text,
    categoryId : Nat,
    totalFee : Nat,
    duration : Text,
    emiOptions : [Nat],
    description : Text,
    isActive : Bool,
  ) : async Types.Result<Types.Course, Text> {
    CoursesLib.updateCourse(courses, users, caller, id, name, categoryId, totalFee, duration, emiOptions, description, isActive);
  };

  public shared ({ caller }) func deleteCourse(id : Nat) : async Types.Result<Bool, Text> {
    CoursesLib.deleteCourse(courses, users, caller, id);
  };
}
