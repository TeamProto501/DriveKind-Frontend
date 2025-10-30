<!-- src/lib/components/Navbar.svelte -->
<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { getContext, onMount, setContext } from "svelte";
  import {
    Home,
    Menu,
    X,
    User,
    Settings,
    HelpCircle,
    Bell,
    ChevronDown,
    ChevronRight,
    LogOut,
    Building2,
    Users,
    Database,
    FileText,
    Calendar,
    Car,
    UserCheck,
    Plus,
    Clock,
    CheckCircle,
    MapPin,
    Star,
    Shield,
    UserCog,
    Truck,
  } from "@lucide/svelte";
  import type { RoleEnum, Profile, Organization } from "$lib/types";

  // Import shadcn-svelte sidebar components
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { Badge } from "$lib/components/ui/badge";

  // Get session from context (passed from layout)
  let { data, children } = $props();
  setContext("session", data.session);

  // User state
  let userProfile = $state<Profile | null>(null);
  let userRoles = $state<RoleEnum[]>([]);
  let userOrganization = $state<Organization | null>(null);
  let isLoading = $state(true);

  // Get user initials for avatar
  const userInitials = $derived(
    userProfile
      ? `${userProfile.first_name?.[0] || ""}${userProfile.last_name?.[0] || ""}`.toUpperCase()
      : data.session?.user?.email?.[0]?.toUpperCase() || "U"
  );

  // Get display name
  const displayName = $derived(
    userProfile
      ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()
      : data.session?.user?.email || "User"
  );

  // Check if current route is active
  function isActiveRoute(href: string): boolean {
    return (
      $page.url.pathname === href || $page.url.pathname.startsWith(href + "/")
    );
  }

  // Get icon component based on icon string
  function getIconComponent(icon: string) {
    const iconMap: Record<string, any> = {
      Home: Home,
      Users: Users,
      Database: Database,
      FileText: FileText,
      Calendar: Calendar,
      Car: Car,
      UserCheck: UserCheck,
      Clock: Clock,
      CheckCircle: CheckCircle,
      MapPin: MapPin,
      Star: Star,
      Building2: Building2,
      Shield: Shield,
      UserCog: UserCog,
      Truck: Truck,
      Settings: Settings,
      HelpCircle: HelpCircle,
      User: User,
    };
    return iconMap[icon] || Home;
  }

  // Check if user has any of the required roles
  function hasRole(roles: RoleEnum[]): boolean {
    return roles.some((role) => userRoles.includes(role));
  }

  // Navigation groups organized by feature area
  const navigationGroups = $derived(() => {
    const groups = [];

    // Platform Section - Common items
    const platformItems = [];

    // Home (available to all)
    platformItems.push({ label: "Home", href: "/", icon: "Home" });

    // Calendar (available to all)
    platformItems.push({
      label: "Schedule",
      href: "/calendar",
      icon: "Calendar",
    });

    // Reports (available to all)
    platformItems.push({
      label: "Reports",
      href: "/reports",
      icon: "FileText",
    });

    if (platformItems.length > 0) {
      groups.push({
        label: "Platform",
        items: platformItems,
      });
    }

    // Dispatcher Section
    if (hasRole(["Dispatcher", "Admin", "Super Admin"])) {
      groups.push({
        label: "Dispatcher",
        icon: "Truck",
        collapsible: true,
        items: [
          { label: "Dashboard", href: "/dispatcher/dashboard" },
          { label: "Ride Management", href: "/dispatcher/rides" },
          { label: "Driver Management", href: "/dispatcher/drivers" },
          { label: "Destinations", href: "/dispatcher/destinations" },
        ],
      });
    }

    // Driver Section
    if (hasRole(["Driver"])) {
      groups.push({
        label: "Driver",
        icon: "Car",
        collapsible: true,
        items: [
          { label: "My Rides", href: "/driver/rides" },
          { label: "My Schedule", href: "/driver/schedule" },
          { label: "Unavailability", href: "/driver/unavail" },
        ],
      });
    }

    // Admin Section
    if (hasRole(["Admin", "Super Admin"])) {
      const adminItems = [];

      if (hasRole(["Admin", "Super Admin"])) {
        adminItems.push({ label: "Dashboard", href: "/admin/dash" });
        adminItems.push({ label: "User Management", href: "/admin/users" });
        adminItems.push({ label: "Database", href: "/admin/database" });
        adminItems.push({ label: "Configuration", href: "/admin/config" });
        adminItems.push({ label: "Audit Logs", href: "/admin/audit" });
      }

      if (hasRole(["Super Admin"])) {
        adminItems.push({
          label: "Organizations",
          href: "/admin/organizations",
        });
      }

      if (adminItems.length > 0) {
        groups.push({
          label: "Admin",
          icon: "Shield",
          collapsible: true,
          items: adminItems,
        });
      }
    }

    // Help Section
    groups.push({
      label: "Support",
      items: [{ label: "Help", href: "/help", icon: "HelpCircle" }],
    });

    return groups;
  });

  // Load user data on mount
  onMount(() => {
    if (data?.profile) {
      // Use real profile if available
      userProfile = data.profile as any;
      if (Array.isArray(data.roles)) {
        userRoles = data.roles as RoleEnum[];
      }
    } else {
      // Fallback to mock data for testing
      userProfile = {
        user_id: "mock-user-id",
        org_id: 1,
        first_name: "John",
        last_name: "Doe",
        date_of_birth: null,
        primary_phone: "+1-555-0123",
        secondary_phone: null,
        contact_pref: "Phone",
        gender: "Male",
        street_address: "123 Main St",
        address2: null,
        city: "Anytown",
        state: "CA",
        zip_code: "12345",
        lives_alone: true,
      } as unknown as Profile;
      userRoles = ["Super Admin"]; // Set as Super Admin for testing
      userOrganization = {
        org_id: 1,
        name: "DriveKind Transit Services",
        contact_email: "admin@drivekind.com",
        contact_phone: "+1-555-0123",
        address: "123 Transit Way",
        city: "Anytown",
        state: "CA",
        zip_code: "12345",
      } as Organization;
    }

    isLoading = false;
  });

  // Logout function
  async function handleLogout() {
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        window.location.href = "/login";
      } else {
        // Fallback: redirect to login
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: redirect to login
      window.location.href = "/login";
    }
  }

  // Navigation function
  function navigateTo(href: string) {
    goto(href);
  }
</script>

<Sidebar.Provider>
  <Sidebar.Root class="w-64 bg-slate-50 border-r border-slate-200">
    <!-- Sidebar Header -->
    <Sidebar.Header class="p-4 border-b border-slate-200">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-lg">DK</span>
        </div>
        <div class="flex flex-col">
          <h1 class="text-lg font-semibold text-slate-900">DriveKind</h1>
          {#if userOrganization}
            <p class="text-xs text-slate-600">{userOrganization.name}</p>
          {/if}
        </div>
      </div>
    </Sidebar.Header>

    <!-- Sidebar Content -->
    <Sidebar.Content class="p-4">
      {#if isLoading}
        <div class="p-4 text-center text-gray-500">Loading navigation...</div>
      {:else}
        {#each navigationGroups() as group}
          <Sidebar.Group>
            <Sidebar.GroupLabel class="text-slate-600 font-medium text-sm uppercase tracking-wide mb-3">
              {group.label}
            </Sidebar.GroupLabel>
            <Sidebar.Menu>
              {#each group.items as item}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton
                    onclick={() => navigateTo(item.href)}
                    class="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-100 {isActiveRoute(item.href) ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : ''}"
                  >
                    {#if item.icon}
                      {@const IconComponent = getIconComponent(item.icon)}
                      <IconComponent class="w-4 h-4" />
                    {/if}
                    <span>{item.label}</span>
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {/each}
            </Sidebar.Menu>
          </Sidebar.Group>
        {/each}
      {/if}
    </Sidebar.Content>

    <!-- Sidebar Footer -->
    <Sidebar.Footer class="p-4 border-t border-slate-200">
      <div class="space-y-4">
        <!-- User Info -->
        <div class="flex items-center gap-3 p-3 rounded-lg bg-slate-100">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-medium">{userInitials}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-900 truncate">{displayName}</p>
            <p class="text-xs text-slate-600 truncate">{data.session?.user?.email}</p>
          </div>
        </div>

        <!-- Logout Button -->
        <Button
          variant="ghost"
          size="sm"
          class="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          onclick={handleLogout}
        >
          <LogOut class="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </Sidebar.Footer>
  </Sidebar.Root>

  <!-- Main Content Area -->
  <Sidebar.Inset>
    <!-- Top Bar with Sidebar Trigger -->
    <header class="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
      <Sidebar.Trigger class="-ml-1" />
      <Separator orientation="vertical" class="mr-2 h-4" />
      <div class="flex items-center gap-2">
        <Bell class="h-4 w-4 text-slate-600" />
        <span class="text-sm text-slate-600">Notifications</span>
      </div>
    </header>

    <!-- Page Content -->
    <div class="flex flex-1 flex-col gap-4 p-4 bg-slate-50 min-h-screen">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>