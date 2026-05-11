import Types "../types/common";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public func addCategory(
    categories : Map.Map<Nat, Types.CourseCategory>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    name : Text,
    description : Text,
    state : Types.AppState,
  ) : Types.Result<Types.CourseCategory, Text> {
    let role = switch (users.get(caller)) {
      case (?(u)) { u.role };
      case null { return #err("User not found") };
    };
    if (role != #admin and role != #teamHead) { return #err("Unauthorized") };
    state.nextCategoryId += 1;
    let id = state.nextCategoryId;
    let cat : Types.CourseCategory = { id; name; description; createdBy = caller };
    categories.add(id, cat);
    #ok(cat);
  };

  public func getCategories(
    categories : Map.Map<Nat, Types.CourseCategory>,
  ) : [Types.CourseCategory] {
    categories.values() |> _.toArray();
  };

  public func updateCategory(
    categories : Map.Map<Nat, Types.CourseCategory>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
    name : Text,
    description : Text,
  ) : Types.Result<Types.CourseCategory, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    switch (categories.get(id)) {
      case (?(cat)) {
        let updated = { cat with name; description };
        categories.add(id, updated);
        #ok(updated);
      };
      case null { #err("Category not found") };
    };
  };

  public func deleteCategory(
    categories : Map.Map<Nat, Types.CourseCategory>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
  ) : Types.Result<Bool, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    categories.remove(id);
    #ok(true);
  };

  public func addCourse(
    courses : Map.Map<Nat, Types.Course>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    name : Text,
    categoryId : Nat,
    totalFee : Nat,
    duration : Text,
    emiOptions : [Nat],
    description : Text,
    state : Types.AppState,
  ) : Types.Result<Types.Course, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    state.nextCourseId += 1;
    let id = state.nextCourseId;
    let course : Types.Course = { id; name; categoryId; totalFee; duration; emiOptions; description; isActive = true };
    courses.add(id, course);
    #ok(course);
  };

  public func getCourses(
    courses : Map.Map<Nat, Types.Course>,
  ) : [Types.Course] {
    courses.values()
      |> _.filter(func(c : Types.Course) : Bool { c.isActive })
      |> _.toArray();
  };

  public func getCourse(
    courses : Map.Map<Nat, Types.Course>,
    id : Nat,
  ) : ?Types.Course {
    courses.get(id);
  };

  public func updateCourse(
    courses : Map.Map<Nat, Types.Course>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
    name : Text,
    categoryId : Nat,
    totalFee : Nat,
    duration : Text,
    emiOptions : [Nat],
    description : Text,
    isActive : Bool,
  ) : Types.Result<Types.Course, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    switch (courses.get(id)) {
      case (?(c)) {
        let updated = { c with name; categoryId; totalFee; duration; emiOptions; description; isActive };
        courses.add(id, updated);
        #ok(updated);
      };
      case null { #err("Course not found") };
    };
  };

  public func deleteCourse(
    courses : Map.Map<Nat, Types.Course>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
  ) : Types.Result<Bool, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    switch (courses.get(id)) {
      case (?(c)) {
        let updated = { c with isActive = false };
        courses.add(id, updated);
        #ok(true);
      };
      case null { #err("Course not found") };
    };
  };
}
