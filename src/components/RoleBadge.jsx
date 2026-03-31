const ROLE_STYLES = {
  ADMIN:   "bg-red-100 text-red-700 border border-red-200",
  MANAGER: "bg-blue-100 text-blue-700 border border-blue-200",
  CASHIER: "bg-green-100 text-green-700 border border-green-200",
};

const ROLE_ICONS = {
  ADMIN:   "👑",
  MANAGER: "🎯",
  CASHIER: "🛒",
};

export default function RoleBadge({ role, size = "sm" }) {
  const sizeClass = size === "xs"
    ? "px-1.5 py-0.5 text-xs"
    : "px-2.5 py-1 text-sm";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full
      font-medium ${ROLE_STYLES[role] ?? ""} ${sizeClass}`}>
      <span>{ROLE_ICONS[role]}</span>
      {role}
    </span>
  );
}
