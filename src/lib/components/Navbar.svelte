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
  
  // Active role for navigation filtering
  let activeRole = $state<RoleEnum | null>(null);

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
      "Home": Home,
      "Users": Users,
      "Database": Database,
      "FileText": FileText,
      "Calendar": Calendar,
      "Car": Car,
      "UserCheck": UserCheck,
      "Clock": Clock,
      "CheckCircle": CheckCircle,
      "MapPin": MapPin,
      "Star": Star,
      "Building2": Building2,
      "Shield": Shield,
      "UserCog": UserCog,
      "Truck": Truck,
      "Settings": Settings,
      "HelpCircle": HelpCircle,
      "User": User,
    };
    return iconMap[icon] || Home;
  }

  // Role-based navigation items filtered by active role
  const roleBasedItems = $derived(() => {
		const items = [];
    const currentRole = activeRole || (userRoles.length > 0 ? userRoles[0] : null);
    
    if (!currentRole) return items;
		
    // Admin items
    if (currentRole === 'Admin') {
			items.push(
        { label: 'Dashboard', href: '/admin/dash', icon: 'Home', badge: null },
        { label: 'Users', href: '/admin/users', icon: 'Users', badge: null },
        { label: 'Database', href: '/admin/database', icon: 'Database', badge: null },
        { label: 'Configuration', href: '/admin/config', icon: 'Settings', badge: null },
        { label: 'Reports', href: '/admin/reports', icon: 'FileText', badge: null },
        { label: 'Audit Logs', href: '/admin/audit', icon: 'Shield', badge: null }
      );
    }
    
    // Super Admin items - Only Organizations
    if (currentRole === 'Super Admin') {
			items.push(
        { label: 'Organizations', href: '/admin/organizations', icon: 'Building2', badge: null }
      );
    }
    
    
    // Dispatcher items
    if (currentRole === 'Dispatcher') {
			items.push(
        { label: 'Dispatcher Dashboard', href: '/dispatcher/dashboard', icon: 'Truck', badge: null },
        { label: 'Ride Management', href: '/dispatcher/rides', icon: 'Car', badge: null },
        { label: 'Driver Management', href: '/dispatcher/drivers', icon: 'UserCog', badge: null }
      );
    }
    
    // Driver items
    if (currentRole === 'Driver') {
			items.push(
        { label: 'My Rides', href: '/driver/rides', icon: 'Car', badge: null },
      );
    }
    
    // Common items for all roles
    items.push(
      { label: 'Schedule', href: '/calendar', icon: 'Calendar', badge: null, roles: ['Super Admin', 'Admin', 'Dispatcher', 'Driver'] },
      { label: 'Help', href: '/help', icon: 'HelpCircle', badge: null }
    );
		
		return items;
	});
	
  // Quick actions based on active role
  const quickActions = $derived(() => {
    const actions = [];
    const currentRole = activeRole || (userRoles.length > 0 ? userRoles[0] : null);
    
    if (currentRole === 'Dispatcher') {
      actions.push(
        { label: 'Create Ride Request', href: '/dispatcher/rides', icon: 'Plus' },
        { label: 'Assign Driver', href: '/dispatcher/drivers', icon: 'UserCheck' }
      );
    }
    
    return actions;
  });

  // Load user data on mount
  onMount(() => {
    if (data?.profile) {
      // Use real profile if available
      userProfile = data.profile as any;
      if (Array.isArray(data.roles)) {
        userRoles = data.roles as RoleEnum[];
        activeRole = userRoles[0]; // Set first role as active
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
      activeRole = "Super Admin";
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
    
    // Add click outside handler for profile dropdown
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('profile-dropdown');
      const target = event.target as Node;
      if (dropdown && !dropdown.contains(target) && !dropdown.previousElementSibling?.contains(target)) {
        dropdown.classList.add('hidden');
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  // Logout function
  async function handleLogout() {
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        window.location.href = '/login';
      } else {
        // Fallback: redirect to login
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: redirect to login
      window.location.href = '/login';
    }
  }

  // Navigation function
  function navigateTo(href: string) {
    goto(href);
  }

  // Role switching function
  function switchRole(role: RoleEnum) {
    activeRole = role;

    // Redirect user to default dashboard for their role
    if (role === "Admin") {
      goto("/admin/dash");
    } else if (role === "Dispatcher") {
      goto("/dispatcher/dashboard");
    } else if (role === "Driver") {
      goto("/driver/rides");
    } else {
      // fallback route
      goto("/profile");
    }
  }
</script>

<!-- Sidebar Provider -->
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
      <!-- Main Navigation -->
      <Sidebar.Group>
        <Sidebar.GroupLabel class="text-slate-600 font-medium text-sm uppercase tracking-wide mb-3">Navigation</Sidebar.GroupLabel>
        <Sidebar.Menu>
          {#if isLoading}
            <div class="p-4 text-center text-gray-500">Loading navigation...</div>
          {:else}
            {#each roleBasedItems() as item}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton 
                  onclick={() => navigateTo(item.href)}
                  class="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-100 {isActiveRoute(item.href) ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : ''}"
                >
                  {@const IconComponent = getIconComponent(item.icon)}
                  <IconComponent class="w-4 h-4" />
                  <span>{item.label}</span>
                  {#if item.badge}
                    <Badge variant="secondary" class="ml-auto">{item.badge}</Badge>
                  {/if}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          {/if}
        </Sidebar.Menu>
      </Sidebar.Group>

      <!-- Quick Actions -->
      {#if quickActions().length > 0}
        <Sidebar.Group>
          <Sidebar.GroupLabel class="text-slate-600 font-medium text-sm uppercase tracking-wide mb-3">Quick Actions</Sidebar.GroupLabel>
          <Sidebar.Menu>
            {#each quickActions() as action}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton 
                  onclick={() => navigateTo(action.href)}
                  class="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                >
                  {@const IconComponent = getIconComponent(action.icon)}
                  <IconComponent class="w-4 h-4" />
                  <span>{action.label}</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
										{/each}
          </Sidebar.Menu>
        </Sidebar.Group>
						{/if}
    </Sidebar.Content>

    <!-- Sidebar Footer -->
    <Sidebar.Footer class="flex flex-col gap-2 p-2">
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton 
            class="h-12 text-sm hover:bg-slate-100 data-[state=open]:bg-slate-100"
            onclick={() => {
              const dropdown = document.getElementById('profile-dropdown');
              if (dropdown) {
                dropdown.classList.toggle('hidden');
              }
            }}
          >
            <div class="relative flex shrink-0 overflow-hidden size-8 rounded-lg">
              <div class="flex size-full items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-semibold uppercase tracking-wide text-white">
                {userInitials}
              </div>
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{displayName}</span>
              <span class="truncate text-xs text-slate-600">{data.session?.user?.email}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto size-4">
              <path d="m7 15 5 5 5-5"></path>
              <path d="m7 9 5-5 5 5"></path>
            </svg>
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
      
      <!-- Dropdown Menu -->
      <div id="profile-dropdown" class="hidden absolute bottom-16 left-2 right-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-50">
        <div class="space-y-1">
          <!-- Role Switcher -->
          {#if userRoles.length > 1}
            <div class="px-2 py-1.5">
              <p class="text-xs font-medium text-slate-600 mb-2">Switch View</p>
              <div class="flex flex-wrap gap-1">
                {#each userRoles as role}
                  <button
                    onclick={() => {
                      switchRole(role);
                      document.getElementById('profile-dropdown')?.classList.add('hidden');
                    }}
                    class="text-xs px-2 py-1 rounded-md border transition-colors
                      {activeRole === role 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}"
                  >
                    {role}
                  </button>
                {/each}
              </div>
            </div>
            <div class="h-px bg-slate-200 my-1"></div>
          {/if}
          
          <!-- Profile Link -->
          <button
            onclick={() => {
              navigateTo('/profile');
              document.getElementById('profile-dropdown')?.classList.add('hidden');
            }}
            class="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <User class="w-4 h-4" />
            <span>Profile</span>
          </button>
          
          <!-- Settings Link -->
          <button
            onclick={() => {
              navigateTo('/admin/config');
              document.getElementById('profile-dropdown')?.classList.add('hidden');
            }}
            class="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Settings class="w-4 h-4" />
            <span>Settings</span>
          </button>
          
          <div class="h-px bg-slate-200 my-1"></div>
          
          <!-- Logout Button -->
          <button
            onclick={() => {
              handleLogout();
              document.getElementById('profile-dropdown')?.classList.add('hidden');
            }}
            class="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut class="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
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