import { useAuth } from "../store/AuthContext";
import { RolePermissions } from "../utils/permissions";

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? "CASHIER";

  return {
    role,
    isAdmin:   role === "ADMIN",
    isManager: role === "MANAGER",
    isCashier: role === "CASHIER",
    can: (permission) => RolePermissions.hasPermission(role, permission),
  };
}
