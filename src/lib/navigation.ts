export type Role =
  | "Super Admin"
  | "Admin"
  | "Dispatcher"
  | "Driver"
  | "Volunteer";

export interface NavItem {
  label: string;
  href: string;
}

export const roleNavigation: Record<Role, NavItem[]> = {
  "Super Admin": [
    { label: "Dashboard", href: "/super-admin/dashboard" },
    { label: "Organizations", href: "/super-admin/organizations" },
    { label: "System Users", href: "/super-admin/users" },
  ],
  Admin: [
    { label: "Dashboard", href: "/admin/dash" },
    { label: "User Management", href: "/admin/users" },
    { label: "Database Management", href: "/admin/database" },
  ],
  Dispatcher: [
    { label: "Dashboard", href: "/dispatcher/dashboard" },
    { label: "Ride Requests", href: "/dispatcher/requests" },
    { label: "Driver Management", href: "/dispatcher/drivers" },
  ],
  Driver: [
    { label: "Dashboard", href: "/driver/dashboard" },
    { label: "My Schedule", href: "/driver/schedule" },
    { label: "Completed Rides", href: "/driver/completed" },
  ],
  Volunteer: [
    { label: "Dashboard", href: "/volunteer/dashboard" },
    { label: "Available Opportunities", href: "/volunteer/opportunities" },
    { label: "My Schedule", href: "/volunteer/schedule" },
  ],
};
