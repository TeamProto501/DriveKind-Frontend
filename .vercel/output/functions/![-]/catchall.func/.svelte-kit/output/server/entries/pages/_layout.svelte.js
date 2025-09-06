import "clsx";
import { F as spread_props, E as pop, A as push, D as setContext } from "../../chunks/index.js";
import "../../chunks/client.js";
import { createBrowserClient } from "@supabase/ssr";
import { P as PUBLIC_SUPABASE_URL, a as PUBLIC_SUPABASE_ANON_KEY } from "../../chunks/public.js";
import { I as Icon } from "../../chunks/Icon.js";
createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  global: {
    fetch
  },
  cookies: {
    getAll() {
      return [];
    },
    setAll() {
    }
  }
});
function Menu($$payload, $$props) {
  push();
  /**
   * @license @lucide/svelte v0.542.0 - ISC
   *
   * ISC License
   *
   * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
   *
   * Permission to use, copy, modify, and/or distribute this software for any
   * purpose with or without fee is hereby granted, provided that the above
   * copyright notice and this permission notice appear in all copies.
   *
   * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
   * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
   * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
   * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
   * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
   * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
   * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * ---
   *
   * The MIT License (MIT) (for portions derived from Feather)
   *
   * Copyright (c) 2013-2023 Cole Bemis
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in all
   * copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   * SOFTWARE.
   *
   */
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M4 12h16" }],
    ["path", { "d": "M4 18h16" }],
    ["path", { "d": "M4 6h16" }]
  ];
  Icon($$payload, spread_props([
    { name: "menu" },
    /**
     * @component @name Menu
     * @description Lucide SVG icon component, renders SVG Element with children.
     *
     * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNCAxMmgxNiIgLz4KICA8cGF0aCBkPSJNNCAxOGgxNiIgLz4KICA8cGF0aCBkPSJNNCA2aDE2IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/menu
     * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
     *
     * @param {Object} props - Lucide icons props and any valid SVG attribute
     * @returns {FunctionalComponent} Svelte component
     *
     */
    props,
    {
      iconNode,
      children: ($$payload2) => {
        props.children?.($$payload2);
        $$payload2.out.push(`<!---->`);
      },
      $$slots: { default: true }
    }
  ]));
  pop();
}
const navigationConfig = [
  // Super Admin Navigation
  {
    label: "Dashboard",
    href: "/super-admin/dashboard",
    icon: "🏢",
    roles: ["Super Admin"]
  },
  {
    label: "Organizations",
    href: "/super-admin/organizations",
    icon: "🏛️",
    roles: ["Super Admin"]
  },
  {
    label: "Create Organization",
    href: "/super-admin/create-organization",
    icon: "➕",
    roles: ["Super Admin"]
  },
  {
    label: "System Users",
    href: "/super-admin/users",
    icon: "👥",
    roles: ["Super Admin"]
  },
  // Admin Navigation
  {
    label: "Dashboard",
    href: "/admin/dash",
    icon: "📊",
    roles: ["Admin"]
  },
  {
    label: "User Management",
    href: "/admin/users",
    icon: "👥",
    roles: ["Admin"]
  },
  {
    label: "Database Management",
    href: "/admin/database",
    icon: "🗄️",
    roles: ["Admin"]
  },
  {
    label: "System Configuration",
    href: "/admin/config",
    icon: "⚙️",
    roles: ["Admin"]
  },
  {
    label: "Trip Reports",
    href: "/admin/reports",
    icon: "📈",
    roles: ["Admin"]
  },
  {
    label: "Audit Logs",
    href: "/admin/audit",
    icon: "📋",
    roles: ["Admin"]
  },
  // Dispatcher Navigation
  {
    label: "Dashboard",
    href: "/dispatcher/dashboard",
    icon: "🚗",
    roles: ["Dispatcher"]
  },
  {
    label: "Ride Requests",
    href: "/dispatcher/requests",
    icon: "📋",
    roles: ["Dispatcher"]
  },
  {
    label: "Trip Database",
    href: "/dispatcher/trips",
    icon: "🗃️",
    roles: ["Dispatcher"]
  },
  {
    label: "Schedule Management",
    href: "/dispatcher/schedule",
    icon: "📅",
    roles: ["Dispatcher"]
  },
  {
    label: "Driver Management",
    href: "/dispatcher/drivers",
    icon: "👨‍✈️",
    roles: ["Dispatcher"]
  },
  {
    label: "Client Management",
    href: "/dispatcher/clients",
    icon: "👤",
    roles: ["Dispatcher"]
  },
  {
    label: "Volunteer Management",
    href: "/dispatcher/volunteers",
    icon: "🤝",
    roles: ["Dispatcher"]
  },
  // Driver Navigation
  {
    label: "Dashboard",
    href: "/driver/dashboard",
    icon: "🚙",
    roles: ["Driver"]
  },
  {
    label: "My Schedule",
    href: "/driver/schedule",
    icon: "📅",
    roles: ["Driver"]
  },
  {
    label: "Submit Availability",
    href: "/driver/availability",
    icon: "⏰",
    roles: ["Driver"]
  },
  {
    label: "Post-Trip Data",
    href: "/driver/post-trip",
    icon: "✅",
    roles: ["Driver"]
  },
  {
    label: "Completed Rides",
    href: "/driver/completed",
    icon: "🛣️",
    roles: ["Driver"]
  },
  {
    label: "My Profile",
    href: "/driver/profile",
    icon: "👤",
    roles: ["Driver"]
  },
  // Volunteer Navigation
  {
    label: "Dashboard",
    href: "/volunteer/dashboard",
    icon: "🤝",
    roles: ["Volunteer"]
  },
  {
    label: "Registration",
    href: "/volunteer/registration",
    icon: "📝",
    roles: ["Volunteer"]
  },
  {
    label: "Available Opportunities",
    href: "/volunteer/opportunities",
    icon: "🌟",
    roles: ["Volunteer"]
  },
  {
    label: "My Schedule",
    href: "/volunteer/schedule",
    icon: "📅",
    roles: ["Volunteer"]
  },
  {
    label: "My Profile",
    href: "/volunteer/profile",
    icon: "👤",
    roles: ["Volunteer"]
  },
  // Common Navigation (available to all authenticated users)
  {
    label: "Profile",
    href: "/profile",
    icon: "👤",
    roles: ["Super Admin", "Admin", "Dispatcher", "Driver", "Volunteer"]
  },
  {
    label: "Help & Support",
    href: "/help",
    icon: "❓",
    roles: ["Super Admin", "Admin", "Dispatcher", "Driver", "Volunteer"]
  }
];
const quickActions = {
  dispatcher: [
    {
      label: "Create Ride Request",
      href: "/dispatcher/requests/create",
      icon: "➕"
    },
    { label: "Assign Driver", href: "/dispatcher/schedule/assign", icon: "👨‍✈️" }
  ],
  driver: [
    { label: "Submit Availability", href: "/driver/availability", icon: "⏰" },
    { label: "Post-Trip Data", href: "/driver/post-trip", icon: "✅" }
  ],
  volunteer: [
    {
      label: "Submit Availability",
      href: "/volunteer/availability",
      icon: "⏰"
    },
    {
      label: "View Opportunities",
      href: "/volunteer/opportunities",
      icon: "🌟"
    }
  ]
};
function getNavigationItems(userRoles) {
  if (!userRoles || userRoles.length === 0) return [];
  return navigationConfig.filter(
    (item) => item.roles.some((role) => userRoles.includes(role))
  );
}
function getQuickActions(userRoles) {
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
function getDefaultRoute(userRoles) {
  if (!userRoles || userRoles.length === 0) return "/";
  const rolePriority = {
    "Super Admin": 1,
    Admin: 2,
    Dispatcher: 3,
    Driver: 4,
    Volunteer: 5,
    Client: 6
  };
  const highestRole = userRoles.reduce(
    (highest, current) => rolePriority[current] < rolePriority[highest] ? current : highest
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
function Navbar($$payload, $$props) {
  push();
  let { data } = $$props;
  setContext("session", data.session);
  let userRoles = [];
  const navigationItems = getNavigationItems(userRoles);
  getQuickActions(userRoles);
  getDefaultRoute(userRoles);
  navigationItems.slice(0, 6);
  navigationItems.slice(6);
  data.session?.user?.email?.[0]?.toUpperCase() || "U";
  data.session?.user?.email || "User";
  $$payload.out.push(`<nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between items-center h-16"><div class="flex items-center"><a href="/" class="flex items-center space-x-3"><div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><span class="text-white font-bold text-lg">DK</span></div> <div class="hidden sm:block"><h1 class="text-xl font-semibold text-gray-900">DriveKind</h1></div></a></div> `);
  if (data.session && false) ;
  else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="flex items-center space-x-2">`);
  if (data.session && false) ;
  else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="flex items-center space-x-2"><a href="/signup" class="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors duration-200">Sign Up</a> <a href="/login" class="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors duration-200">Sign In</a></div>`);
  }
  $$payload.out.push(`<!--]--> <button class="md:hidden p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 mobile-menu"><span class="sr-only">Open menu</span> `);
  {
    $$payload.out.push("<!--[!-->");
    Menu($$payload, { class: "w-5 h-5" });
  }
  $$payload.out.push(`<!--]--></button></div></div></div> `);
  if (data.session && false) ;
  else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></nav> `);
  if (!data.session) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="bg-green-600 text-white"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3"><div class="flex items-center justify-center space-x-3"><span class="text-lg">📞</span> <span class="font-medium">Need a ride? Call us at:</span> <a href="tel:+1-555-DRIVE-KIND" class="text-xl font-bold hover:underline">(555) DRIVE-KIND</a></div></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="bg-white shadow-sm border-b border-gray-200"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between items-center h-16"><div class="flex items-center space-x-3"><div class="w-8 h-8 bg-gray-300 rounded-lg animate-pulse"></div> <div class="space-y-2"><div class="h-4 w-32 bg-gray-300 rounded animate-pulse"></div> <div class="h-3 w-24 bg-gray-300 rounded animate-pulse"></div></div></div> <div class="flex items-center space-x-4"><div class="h-8 w-8 bg-gray-300 rounded-full animate-pulse"></div> <div class="h-8 w-20 bg-gray-300 rounded animate-pulse"></div></div></div></div></div>`);
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
function _layout($$payload, $$props) {
  push();
  let { children, data } = $$props;
  setContext("session", data.session);
  Navbar($$payload, { data });
  $$payload.out.push(`<!----> `);
  children($$payload);
  $$payload.out.push(`<!---->`);
  pop();
}
export {
  _layout as default
};
