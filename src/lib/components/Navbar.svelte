<!-- src/lib/components/Navbar.svelte -->
<script lang="ts">
  import { page } from "$app/stores";
  import { enhance } from "$app/forms";
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
  } from "@lucide/svelte";
  import {
    getNavigationItems,
    getQuickActions,
    getDefaultRoute,
  } from "$lib/navigation";
  import type { RoleEnum, Profile, Organization } from "$lib/types";
  // Get session from context (passed from layout)
  let { data } = $props();
  setContext("session", data.session);
  import * as Sidebar from "./ui/sidebar/index.js";
  // User state
  let userProfile = $state<Profile | null>(null);
  let userRoles = $state<RoleEnum[]>([]);
  let userOrganization = $state<Organization | null>(null);
  let isLoading = $state(true);

  // UI state
  let isMobileMenuOpen = $state(false);
  let isProfileDropdownOpen = $state(false);
  let isQuickActionsOpen = $state(false);
  let isMoreDropdownOpen = $state(false);
  let logoutLoading = $state(false);

  // Get navigation items based on user roles using runes
  const navigationItems = $derived(getNavigationItems(userRoles));
  const quickActions = $derived(getQuickActions(userRoles));
  const defaultRoute = $derived(getDefaultRoute(userRoles));

  // Split navigation items for main nav and more dropdown
  const mainNavItems = $derived(navigationItems.slice(0, 6));
  const moreNavItems = $derived(navigationItems.slice(6));

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

  // Close dropdowns when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".profile-dropdown")) {
      isProfileDropdownOpen = false;
    }
    if (!target.closest(".mobile-menu")) {
      isMobileMenuOpen = false;
    }
    if (!target.closest(".quick-actions")) {
      isQuickActionsOpen = false;
    }
    if (!target.closest(".more-dropdown")) {
      isMoreDropdownOpen = false;
    }
  }

  // Toggle mobile menu
  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  // Toggle profile dropdown
  function toggleProfileDropdown() {
    isProfileDropdownOpen = !isProfileDropdownOpen;
  }

  // Toggle quick actions
  function toggleQuickActions() {
    isQuickActionsOpen = !isQuickActionsOpen;
  }

  // Toggle more dropdown
  function toggleMoreDropdown() {
    isMoreDropdownOpen = !isMoreDropdownOpen;
  }

  // Get icon component based on icon string
  function getIconComponent(icon: string) {
    const iconMap: Record<string, any> = {
      "🏠": Home,
      "👥": Users,
      "🗄️": Database,
      "📊": FileText,
      "📅": Calendar,
      "🚗": Car,
      "✅": UserCheck,
      "⏰": Clock,
      "🎯": CheckCircle,
      "📍": MapPin,
      "⭐": Star,
      "🏢": Building2,
    };
    return iconMap[icon] || Home;
  }

  // Load mock user data on mount
  onMount(() => {
    // Simulate loading user data
    setTimeout(() => {
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
      };
      userRoles = ["Admin", "Dispatcher"];
      userOrganization = {
        org_id: 1,
        name: "Metro Transit Services",
        contact_email: "admin@metrotransit.com",
        contact_phone: "+1-555-0123",
        address: "123 Transit Way",
        city: "Anytown",
        state: "CA",
        zip_code: "12345",
      };
      isLoading = false;
    }, 1000);

    // Add click outside listener
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });
</script>

<!-- Main Navigation Bar -->
<!-- <nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16"> -->
<!-- Logo and Brand -->
<!-- <div class="flex items-center">
        <a href="/" class="flex items-center space-x-3">
          <div
            class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"
          >
            <span class="text-white font-bold text-lg">DK</span>
          </div>
          <div class="hidden sm:block">
            <h1 class="text-xl font-semibold text-gray-900">DriveKind</h1>
          </div>
        </a>
      </div> -->

<!-- Desktop Navigation -->
<!-- {#if data.session && !isLoading}
        <div class="hidden md:flex items-center space-x-1">
          {#each mainNavItems as item}
            {@const IconComponent = getIconComponent(item.icon)}
            <a
              href={item.href}
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 {isActiveRoute(
                item.href
              )
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}"
            >
              <IconComponent class="w-4 h-4" />
              <span>{item.label}</span>
              {#if item.badge}
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                >
                  {item.badge}
                </span>
              {/if}
            </a>
          {/each}
          {#if moreNavItems.length > 0}
            <div class="relative more-dropdown">
              <button
                onclick={toggleMoreDropdown}
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                title="More"
              >
                <ChevronDown class="w-4 h-4" />
                <span>More</span>
              </button>

              {#if isMoreDropdownOpen}
                <div
                  class="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100"
                >
                  <div class="px-4 py-3">
                    <h3 class="text-sm font-medium text-gray-900">More</h3>
                  </div>
                  <div class="py-1">
                    {#each moreNavItems as item}
                      {@const IconComponent = getIconComponent(item.icon)}
                      <a
                        href={item.href}
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onclick={() => (isMoreDropdownOpen = false)}
                      >
                        <IconComponent class="w-4 h-4 mr-2" />
                        {item.label}
                      </a>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if} -->

<!-- Right side - User menu and actions -->
<!-- <div class="flex items-center space-x-2">
        {#if data.session && !isLoading} -->
<!-- Quick Actions Dropdown -->
<!-- {#if quickActions.length > 0}
            <div class="relative quick-actions">
              <button
                onclick={toggleQuickActions}
                class="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                title="Quick Actions"
              >
                <Plus class="w-4 h-4" />
              </button>

              {#if isQuickActionsOpen}
                <div
                  class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100"
                >
                  <div class="px-3 py-2">
                    <h3 class="text-sm font-medium text-gray-900">
                      Quick Actions
                    </h3>
                  </div>
                  <div class="py-1">
                    {#each quickActions as action}
                      <a
                        href={action.href}
                        class="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onclick={() => (isQuickActionsOpen = false)}
                      >
                        <span class="mr-2">{action.icon}</span>
                        {action.label}
                      </a>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if} -->

<!-- Notifications -->
<!--  <button
            class="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 relative"
          >
            <Bell class="w-4 h-4" /> -->
<!-- Notification badge -->
<!-- <span
              class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"
            ></span>
          </button> -->

<!-- User Profile Dropdown -->
<!-- <div class="relative profile-dropdown">
            <button
              onclick={toggleProfileDropdown}
              class="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-100 transition-colors duration-200"
            >
              <div
                class="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium"
              >
                {userInitials}
              </div>
              <div class="hidden xl:block text-left">
                <p class="text-sm font-medium text-gray-900">{displayName}</p>
                <p class="text-xs text-gray-500">{userRoles[0]}</p>
              </div>
              <ChevronDown class="w-4 h-4 text-gray-400" />
            </button> -->

<!-- {#if isProfileDropdownOpen}
              <div
                class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100"
              >
                <div class="px-3 py-2">
                  <p class="text-sm text-gray-900 font-medium">{displayName}</p>
                  <p class="text-sm text-gray-500">{data.session.user.email}</p>
                  <div class="mt-2">
                    {#each userRoles as role}
                      <span
                        class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                      >
                        {role}
                      </span>
                    {/each}
                  </div>
                </div> -->
<!-- <div class="py-1">
                  <a
                    href="/profile"
                    class="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onclick={() => (isProfileDropdownOpen = false)}
                  >
                    <User class="w-4 h-4 mr-2" />
                    Profile Settings
                  </a>
                  <a
                    href="/help"
                    class="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onclick={() => (isProfileDropdownOpen = false)}
                  >
                    <HelpCircle class="w-4 h-4 mr-2" />
                    Help & Support
                  </a>
                  <div class="border-t border-gray-100">
                    <form
                      method="POST"
                      action="/?/logout"
                      use:enhance={() => {
                        logoutLoading = true;
                      }}
                    >
                      <button
                        type="submit"
                        disabled={logoutLoading}
                        class="flex items-center w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <LogOut class="w-4 h-4 mr-2" />
                        {logoutLoading ? "Signing out..." : "Sign Out"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {:else} -->
<!-- Sign in/Sign up buttons for non-authenticated users -->
<!-- <div class="flex items-center space-x-2">
            <a
              href="/signup"
              class="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors duration-200"
            >
              Sign Up
            </a>
            <a
              href="/login"
              class="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors duration-200"
            >
              Sign In
            </a>
          </div>
        {/if} -->

<!-- Mobile menu button -->
<!-- <button
          onclick={toggleMobileMenu}
          class="md:hidden p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 mobile-menu"
        >
          <span class="sr-only">Open menu</span>
          {#if isMobileMenuOpen}
            <X class="w-5 h-5" />
          {:else}
            <Menu class="w-5 h-5" />
          {/if}
        </button>
      </div>
    </div>
  </div> -->

<!-- Mobile Navigation Menu -->
<!-- {#if data.session && !isLoading && isMobileMenuOpen}
    <div class="md:hidden border-t border-gray-200 bg-white mobile-menu">
      <div class="px-2 pt-2 pb-3 space-y-1">
        {#each navigationItems as item}
          {@const IconComponent = getIconComponent(item.icon)}
          <a
            href={item.href}
            class="flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 {isActiveRoute(
              item.href
            )
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}"
            onclick={() => (isMobileMenuOpen = false)}
          >
            <IconComponent class="w-5 h-5 mr-3" />
            {item.label}
            {#if item.badge}
              <span
                class="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
              >
                {item.badge}
              </span>
            {/if}
          </a>
        {/each}
      </div> -->

<!-- Quick Actions in Mobile Menu -->
<!-- {#if quickActions.length > 0}
        <div class="px-2 pt-2 pb-3 border-t border-gray-200">
          <h3
            class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            Quick Actions
          </h3>
          <div class="space-y-1">
            {#each quickActions as action}
              <a
                href={action.href}
                class="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onclick={() => (isMobileMenuOpen = false)}
              >
                <span class="mr-3">{action.icon}</span>
                {action.label}
              </a>
            {/each}
          </div>
        </div>
      {/if} -->

<!-- User Profile in Mobile Menu -->
<!-- <div class="pt-4 pb-3 border-t border-gray-200">
        <div class="flex items-center px-5">
          <div
            class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium"
          >
            {userInitials}
          </div>
          <div class="ml-3">
            <p class="text-base font-medium text-gray-800">{displayName}</p>
            <p class="text-sm text-gray-500">{userRoles.join(", ")}</p>
          </div>
        </div>
        <div class="mt-3 px-2 space-y-1">
          <form
            method="POST"
            action="/?/logout"
            use:enhance={() => {
              logoutLoading = true;
            }}
          >
            <button
              type="submit"
              disabled={logoutLoading}
              class="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut class="w-4 h-4 mr-2" />
              {logoutLoading ? "Signing out..." : "Sign Out"}
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</nav> -->

<!-- Emergency Contact Banner for Clients (when not logged in) -->
<!-- {#if !data.session}
  <div class="bg-green-600 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div class="flex items-center justify-center space-x-3">
        <span class="text-lg">📞</span>
        <span class="font-medium">Need a ride? Call us at:</span>
        <a
          href="tel:+1-555-DRIVE-KIND"
          class="text-xl font-bold hover:underline"
        >
          (555) DRIVE-KIND
        </a>
      </div>
    </div>
  </div>
{/if} -->

<!-- Loading State -->
<!-- {#if isLoading}
  <div class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-gray-300 rounded-lg animate-pulse"></div>
          <div class="space-y-2">
            <div class="h-4 w-32 bg-gray-300 rounded animate-pulse"></div>
            <div class="h-3 w-24 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="h-8 w-8 bg-gray-300 rounded-full animate-pulse"></div>
          <div class="h-8 w-20 bg-gray-300 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
{/if} -->
<Sidebar.Root>
  <Sidebar.Content>
    <!--Sidebar Group for Admin-->
    <Sidebar.Group>
      <Sidebar.GroupLabel>Admin</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        {#each mainNavItems as item}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {@const IconComponent = getIconComponent(item.icon)}
              <a
                href={item.href}
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 {isActiveRoute(
                  item.href
                )
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}"
              >
                <IconComponent class="w-4 h-4" />
                <span>{item.label}</span>
                {#if item.badge}
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                  >
                    {item.badge}
                  </span>
                {/if}
              </a>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</Sidebar.Root>
