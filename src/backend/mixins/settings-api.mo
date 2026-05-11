import Types "../types/common";
import SettingsLib "../lib/settings";
import Map "mo:core/Map";

mixin (
  settingsStore : Map.Map<Text, Types.AppSettings>,
  users : Map.Map<Principal, Types.UserProfile>,
) {
  public shared query ({ caller }) func getSettings() : async Types.AppSettings {
    SettingsLib.getSettings(settingsStore);
  };

  public shared ({ caller }) func updateSettings(settings : Types.AppSettings) : async Types.Result<Types.AppSettings, Text> {
    SettingsLib.updateSettings(settingsStore, users, caller, settings);
  };
}
