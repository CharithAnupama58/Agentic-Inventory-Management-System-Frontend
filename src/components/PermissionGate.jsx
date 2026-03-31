import { useRole } from "../hooks/useRole";

// Renders children only if user has the required permission
export default function PermissionGate({
  permission,
  fallback = null,
  children
}) {
  const { can } = useRole();
  return can(permission) ? children : fallback;
}
