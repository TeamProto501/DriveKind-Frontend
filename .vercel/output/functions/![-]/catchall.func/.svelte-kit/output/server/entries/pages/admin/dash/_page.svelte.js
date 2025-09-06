import { A as push, F as spread_props, E as pop, K as ensure_array_like, I as escape_html, J as attr, N as attr_class, O as stringify } from "../../../../chunks/index.js";
import { R as RoleGuard, B as Breadcrumbs } from "../../../../chunks/Breadcrumbs.js";
import { P as Plus, U as Users } from "../../../../chunks/users.js";
import { C as Chart_column } from "../../../../chunks/chart-column.js";
import { S as Settings } from "../../../../chunks/settings.js";
import { D as Database } from "../../../../chunks/database.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { C as Car } from "../../../../chunks/car.js";
import { S as Shield } from "../../../../chunks/shield.js";
import { S as Search } from "../../../../chunks/search.js";
import { F as Funnel } from "../../../../chunks/funnel.js";
import { D as Download } from "../../../../chunks/download.js";
import { F as File_text } from "../../../../chunks/file-text.js";
function User_check($$payload, $$props) {
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
    ["path", { "d": "m16 11 2 2 4-4" }],
    ["path", { "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }]
  ];
  Icon($$payload, spread_props([
    { name: "user-check" },
    /**
     * @component @name UserCheck
     * @description Lucide SVG icon component, renders SVG Element with children.
     *
     * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTYgMTEgMiAyIDQtNCIgLz4KICA8cGF0aCBkPSJNMTYgMjF2LTJhNCA0IDAgMCAwLTQtNEg2YTQgNCAwIDAgMC00IDR2MiIgLz4KICA8Y2lyY2xlIGN4PSI5IiBjeT0iNyIgcj0iNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/user-check
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
function Table($$payload, $$props) {
  let array2 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 12];
  let array = array2;
  const each_array = ensure_array_like(
    // console.log(`Selected tab changed to: ${type}`);
    array
  );
  $$payload.out.push(`<div class="flex flex-col"><div class="overflow-x-auto border-1 border-gray-100 rounded-md"><table class="min-w-full divide-y-2 divide-gray-200 bg-white text-sm"><thead class="ltr:text-left rtl:text-right bg-gray-100"><tr><th class="sticky inset-y-0 start-0 px-4 py-4"><label for="SelectAll" class="sr-only">Select All</label> <input type="checkbox" id="SelectAll" class="size-5 rounded-sm border-gray-300"/></th><th class="px-4 py-2 font-medium whitespace-nowrap text-gray-900">Name</th><th class="px-4 py-2 font-medium whitespace-nowrap text-gray-900">Date of Birth</th><th class="px-4 py-2 font-medium whitespace-nowrap text-gray-900">Role</th><th class="px-4 py-2 font-medium whitespace-nowrap text-gray-900">Salary</th></tr></thead><tbody class="divide-y divide-gray-200"><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    each_array[$$index];
    $$payload.out.push(`<tr><td class="sticky inset-y-0 start-0 bg-white px-4 py-4"><label class="sr-only" for="Row1">Row 1</label> <input class="size-5 rounded-sm border-gray-300" type="checkbox" id="Row1"/></td><td class="px-4 py-2 font-medium whitespace-nowrap text-gray-900">John Doe</td><td class="px-4 py-2 whitespace-nowrap text-gray-700">12/05/1995</td><td class="px-4 py-2 whitespace-nowrap text-gray-700">Developer</td><td class="px-4 py-2 whitespace-nowrap text-gray-700">$50,000</td></tr>`);
  }
  $$payload.out.push(`<!--]--><tr><td class="px-4 py-2 whitespace-nowrap text-gray-500">Total: <span class="font-bold text-black">${escape_html(array.length)}</span></td></tr></tbody></table></div></div>`);
}
function _page($$payload) {
  let selectedTab = "que";
  const quickActions = [
    {
      label: "Add User",
      href: "/admin/users/add",
      icon: Plus,
      color: "bg-blue-500"
    },
    {
      label: "Generate Report",
      href: "/admin/reports",
      icon: Chart_column,
      color: "bg-green-500"
    },
    {
      label: "System Settings",
      href: "/admin/config",
      icon: Settings,
      color: "bg-purple-500"
    },
    {
      label: "Database Backup",
      href: "/admin/database",
      icon: Database,
      color: "bg-orange-500"
    }
  ];
  const tabs = [
    {
      id: "que",
      label: "Queue",
      icon: Users,
      description: "Manage ride requests and assignments"
    },
    {
      id: "clients",
      label: "Clients",
      icon: User_check,
      description: "View and manage client accounts"
    },
    {
      id: "drivers",
      label: "Drivers",
      icon: Car,
      description: "Manage driver accounts and schedules"
    }
  ];
  RoleGuard($$payload, {
    requiredRoles: ["Admin"],
    children: ($$payload2) => {
      const each_array = ensure_array_like(quickActions);
      const each_array_1 = ensure_array_like(tabs);
      const each_array_2 = ensure_array_like(tabs);
      $$payload2.out.push(`<div class="min-h-screen bg-gray-50">`);
      Breadcrumbs($$payload2);
      $$payload2.out.push(`<!----> <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div class="mb-8"><div class="flex items-center justify-between"><div><h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1> <p class="text-gray-600 mt-2">Welcome to your admin dashboard. Manage users, view reports, and configure system settings.</p></div> <div class="flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-full">`);
      Shield($$payload2, { class: "w-5 h-5 text-blue-600" });
      $$payload2.out.push(`<!----> <span class="text-sm font-medium text-blue-800">Administrator</span></div></div></div> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let action = each_array[$$index];
        $$payload2.out.push(`<a${attr("href", action.href)} class="group p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"><div class="flex items-center space-x-3"><div${attr_class(`p-2 rounded-lg ${stringify(action.color)} text-white`)}>`);
        action.icon($$payload2, { class: "w-6 h-6" });
        $$payload2.out.push(`<!----></div> <div><h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">${escape_html(action.label)}</h3> <p class="text-sm text-gray-500">Quick access</p></div></div></a>`);
      }
      $$payload2.out.push(`<!--]--></div> <div class="bg-white rounded-lg border border-gray-200 shadow-sm"><div class="border-b border-gray-200"><div class="flex items-center justify-between px-6 py-4"><nav class="flex space-x-8"><!--[-->`);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let tab = each_array_1[$$index_1];
        $$payload2.out.push(`<button type="button"${attr_class(`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${stringify(selectedTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}`)}>`);
        tab.icon($$payload2, { class: "w-4 h-4" });
        $$payload2.out.push(`<!----> <span>${escape_html(tab.label)}</span></button>`);
      }
      $$payload2.out.push(`<!--]--></nav> <div class="flex items-center space-x-2"><button class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200" title="Search">`);
      Search($$payload2, { class: "w-4 h-4" });
      $$payload2.out.push(`<!----></button> <button class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200" title="Filters">`);
      Funnel($$payload2, { class: "w-4 h-4" });
      $$payload2.out.push(`<!----></button> <button class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200" title="Add New">`);
      Plus($$payload2, { class: "w-4 h-4" });
      $$payload2.out.push(`<!----></button> <button class="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">`);
      Download($$payload2, { class: "w-4 h-4" });
      $$payload2.out.push(`<!----> <span>Export</span></button></div></div></div> <div class="p-6"><!--[-->`);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let tab = each_array_2[$$index_2];
        if (selectedTab === tab.id) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="mb-6"><div class="flex items-center space-x-2 text-gray-600 mb-2">`);
          tab.icon($$payload2, { class: "w-5 h-5" });
          $$payload2.out.push(`<!----> <h2 class="text-lg font-medium">${escape_html(tab.label)}</h2></div> <p class="text-gray-500">${escape_html(tab.description)}</p></div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]--> `);
      Table($$payload2);
      $$payload2.out.push(`<!----></div></div> <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"><div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"><div class="flex items-center"><div class="p-2 bg-blue-100 rounded-lg">`);
      Users($$payload2, { class: "w-6 h-6 text-blue-600" });
      $$payload2.out.push(`<!----></div> <div class="ml-4"><p class="text-sm font-medium text-gray-500">Total Users</p> <p class="text-2xl font-semibold text-gray-900">1,234</p></div></div></div> <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"><div class="flex items-center"><div class="p-2 bg-green-100 rounded-lg">`);
      Car($$payload2, { class: "w-6 h-6 text-green-600" });
      $$payload2.out.push(`<!----></div> <div class="ml-4"><p class="text-sm font-medium text-gray-500">Active Drivers</p> <p class="text-2xl font-semibold text-gray-900">89</p></div></div></div> <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"><div class="flex items-center"><div class="p-2 bg-purple-100 rounded-lg">`);
      File_text($$payload2, { class: "w-6 h-6 text-purple-600" });
      $$payload2.out.push(`<!----></div> <div class="ml-4"><p class="text-sm font-medium text-gray-500">Pending Requests</p> <p class="text-2xl font-semibold text-gray-900">23</p></div></div></div></div></div></div>`);
    }
  });
}
export {
  _page as default
};
