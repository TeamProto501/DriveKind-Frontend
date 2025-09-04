import type { NavigationItem, RoleEnum } from "./types";

// Navigation configuration for DriveKind
export const navigationConfig: NavigationItem[] = [
  // Super Admin Navigation
  {
    label: "Dashboard",
    href: "/super-admin/dashboard",
    icon: "🏢",
    roles: ["Super Admin"],
  },
  {
    label: "Organizations",
    href: "/super-admin/organizations",
    icon: "🏛️",
    roles: ["Super Admin"],
  },
  {
    label: "Create Organization",
    href: "/super-admin/create-organization",
    icon: "➕",
    roles: ["Super Admin"],
  },
  {
    label: "System Users",
    href: "/super-admin/users",
    icon: "👥",
    roles: ["Super Admin"],
  },

  // Admin Navigation
  {
    label: "Dashboard",
    href: "/admin/dash",
    icon: "📊",
    roles: ["Admin"],
  },
  {
    label: "User Management",
    href: "/admin/users",
    icon: "👥",
    roles: ["Admin"],
  },
  {
    label: "Database Management",
    href: "/admin/database",
    icon: "🗄️",
    roles: ["Admin"],
  },
  {
    label: "System Configuration",
    href: "/admin/config",
    icon: "⚙️",
    roles: ["Admin"],
  },
  {
    label: "Trip Reports",
    href: "/admin/reports",
    icon: "📈",
    roles: ["Admin"],
  },
  {
    label: "Audit Logs",
    href: "/admin/audit",
    icon: "📋",
    roles: ["Admin"],
  },

  // Dispatcher Navigation
  {
    label: "Dashboard",
    href: "/dispatcher/dashboard",
    icon: "🚗",
    roles: ["Dispatcher"],
  },
  {
    label: "Ride Requests",
    href: "/dispatcher/requests",
    icon: "📋",
    roles: ["Dispatcher"],
  },
  {
    label: "Trip Database",
    href: "/dispatcher/trips",
    icon: "🗃️",
    roles: ["Dispatcher"],
  },
  {
    label: "Schedule Management",
    href: "/dispatcher/schedule",
    icon: "📅",
    roles: ["Dispatcher"],
  },
  {
    label: "Driver Management",
    href: "/dispatcher/drivers",
    icon: "👨‍✈️",
    roles: ["Dispatcher"],
  },
  {
    label: "Client Management",
    href: "/dispatcher/clients",
    icon: "👤",
    roles: ["Dispatcher"],
  },
  {
    label: "Volunteer Management",
    href: "/dispatcher/volunteers",
    icon: "🤝",
    roles: ["Dispatcher"],
  },

  // Driver Navigation
  {
    label: "Dashboard",
    href: "/driver/dashboard",
    icon: "🚙",
    roles: ["Driver"],
  },
  {
    label: "My Schedule",
    href: "/driver/schedule",
    icon: "📅",
    roles: ["Driver"],
  },
  {
    label: "Submit Availability",
    href: "/driver/availability",
    icon: "⏰",
    roles: ["Driver"],
  },
  {
    label: "Post-Trip Data",
    href: "/driver/post-trip",
    icon: "✅",
    roles: ["Driver"],
  },
  {
    label: "Completed Rides",
    href: "/driver/completed",
    icon: "🛣️",
    roles: ["Driver"],
  },
  {
    label: "My Profile",
    href: "/driver/profile",
    icon: "👤",
    roles: ["Driver"],
  },

  // Volunteer Navigation
  {
    label: "Dashboard",
    href: "/volunteer/dashboard",
    icon: "🤝",
    roles: ["Volunteer"],
  },
  {
    label: "Registration",
    href: "/volunteer/registration",
    icon: "📝",
    roles: ["Volunteer"],
  },
  {
    label: "Available Opportunities",
    href: "/volunteer/opportunities",
    icon: "🌟",
    roles: ["Volunteer"],
  },
  {
    label: "My Schedule",
    href: "/volunteer/schedule",
    icon: "📅",
    roles: ["Volunteer"],
  },
  {
    label: "My Profile",
    href: "/volunteer/profile",
    icon: "👤",
    roles: ["Volunteer"],
  },

  // Common Navigation (available to all authenticated users)
  {
    label: "Profile",
    href: "/profile",
    icon: "👤",
    roles: ["Super Admin", "Admin", "Dispatcher", "Driver", "Volunteer"],
  },
  {
    label: "Help & Support",
    href: "/help",
    icon: "❓",
    roles: ["Super Admin", "Admin", "Dispatcher", "Driver", "Volunteer"],
  },
];

// Quick action buttons for common tasks
export const quickActions = {
  dispatcher: [
    {
      label: "Create Ride Request",
      href: "/dispatcher/requests/create",
      icon: "➕",
    },
    { label: "Assign Driver", href: "/dispatcher/schedule/assign", icon: "👨‍✈️" },
  ],
  driver: [
    { label: "Submit Availability", href: "/driver/availability", icon: "⏰" },
    { label: "Post-Trip Data", href: "/driver/post-trip", icon: "✅" },
  ],
  volunteer: [
    {
      label: "Submit Availability",
      href: "/volunteer/availability",
      icon: "⏰",
    },
    {
      label: "View Opportunities",
      href: "/volunteer/opportunities",
      icon: "🌟",
    },
  ],
};

// Function to get navigation items based on user roles
export function getNavigationItems(userRoles: RoleEnum[]): NavigationItem[] {
  if (!userRoles || userRoles.length === 0) return [];

  return navigationConfig.filter((item) =>
    item.roles.some((role) => userRoles.includes(role))
  );
}

// Function to get quick actions based on user roles
export function getQuickActions(userRoles: RoleEnum[]) {
  if (!userRoles || userRoles.length === 0) return [];

  const actions = [];

  if (userRoles.includes("Dispatcher")) {
    actions.push(...quickActions.dispatcher);
  }
  if (userRoles.includes("Driver")) {
    actions.push(...quickActions.driver);
  }
  if (userRoles.includes("Volunteer")) {
    actions.push(...quickActions.volunteer);
  }

  return actions;
}

// Function to get default route based on highest role
export function getDefaultRoute(userRoles: RoleEnum[]): string {
  if (!userRoles || userRoles.length === 0) return "/";

  const rolePriority = {
    "Super Admin": 1,
    Admin: 2,
    Dispatcher: 3,
    Driver: 4,
    Volunteer: 5,
    Client: 6,
  };

  const highestRole = userRoles.reduce((highest, current) =>
    rolePriority[current] < rolePriority[highest] ? current : highest
  );

  switch (highestRole) {
    case "Super Admin":
      return "/super-admin/dashboard";
    case "Admin":
      return "/admin/dash";
    case "Dispatcher":
      return "/dispatcher/dashboard";
    case "Driver":
      return "/driver/dashboard";
    case "Volunteer":
      return "/volunteer/dashboard";
    case "Client":
      return "/";
    default:
      return "/";
  }
}
