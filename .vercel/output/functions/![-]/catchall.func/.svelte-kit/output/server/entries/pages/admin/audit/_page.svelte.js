import { E as pop, A as push, K as ensure_array_like, J as attr, M as maybe_selected, I as escape_html, N as attr_class, O as stringify } from "../../../../chunks/index.js";
import { R as RoleGuard, B as Breadcrumbs } from "../../../../chunks/Breadcrumbs.js";
import { S as Search } from "../../../../chunks/search.js";
import { D as Download } from "../../../../chunks/download.js";
import { C as Calendar } from "../../../../chunks/calendar.js";
import { E as Eye } from "../../../../chunks/eye.js";
import { F as File_text } from "../../../../chunks/file-text.js";
import { S as Settings } from "../../../../chunks/settings.js";
import { D as Database } from "../../../../chunks/database.js";
import { U as User } from "../../../../chunks/user.js";
import { S as Shield } from "../../../../chunks/shield.js";
function _page($$payload, $$props) {
  push();
  const auditLogs = [
    {
      id: 1,
      timestamp: "2024-01-15 14:30:22",
      user: "admin@drivekind.com",
      action: "LOGIN",
      resource: "AUTH",
      details: "User logged in successfully",
      ipAddress: "192.168.1.100",
      status: "SUCCESS"
    },
    {
      id: 2,
      timestamp: "2024-01-15 14:25:15",
      user: "admin@drivekind.com",
      action: "UPDATE",
      resource: "USER",
      details: "Updated user profile: john.doe@drivekind.com",
      ipAddress: "192.168.1.100",
      status: "SUCCESS"
    },
    {
      id: 3,
      timestamp: "2024-01-15 14:20:08",
      user: "dispatcher@drivekind.com",
      action: "CREATE",
      resource: "TRIP",
      details: "Created new trip request #TR-2024-001",
      ipAddress: "192.168.1.101",
      status: "SUCCESS"
    },
    {
      id: 4,
      timestamp: "2024-01-15 14:15:42",
      user: "driver@drivekind.com",
      action: "UPDATE",
      resource: "TRIP",
      details: "Updated trip status to IN_PROGRESS",
      ipAddress: "192.168.1.102",
      status: "SUCCESS"
    },
    {
      id: 5,
      timestamp: "2024-01-15 14:10:30",
      user: "unknown",
      action: "LOGIN",
      resource: "AUTH",
      details: "Failed login attempt for invalid user",
      ipAddress: "192.168.1.103",
      status: "FAILED"
    }
  ];
  let searchQuery = "";
  let selectedResource = "all";
  let selectedStatus = "all";
  let selectedDateRange = "24h";
  let filteredLogs = auditLogs.filter((log) => {
    const matchesStatus = selectedStatus === "all";
    return matchesStatus;
  });
  function getResourceIcon(resource) {
    switch (resource) {
      case "AUTH":
        return Shield;
      case "USER":
        return User;
      case "TRIP":
        return File_text;
      case "DATABASE":
        return Database;
      case "SYSTEM":
        return Settings;
      default:
        return File_text;
    }
  }
  function getStatusColor(status) {
    return status === "SUCCESS" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  }
  RoleGuard($$payload, {
    requiredRoles: ["Admin"],
    children: ($$payload2) => {
      const each_array = ensure_array_like(filteredLogs);
      $$payload2.out.push(`<div class="min-h-screen bg-gray-50">`);
      Breadcrumbs($$payload2);
      $$payload2.out.push(`<!----> <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div class="mb-8"><h1 class="text-3xl font-bold text-gray-900">Audit Logs</h1> <p class="text-gray-600 mt-2">Monitor system activity and security events.</p></div> <div class="bg-white shadow rounded-lg p-6 mb-6"><div class="flex flex-col sm:flex-row gap-4"><div class="flex-1"><div class="relative">`);
      Search($$payload2, {
        class: "w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
      });
      $$payload2.out.push(`<!----> <input${attr("value", searchQuery)} type="text" placeholder="Search logs..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"/></div></div> <div class="flex gap-2"><select class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">`);
      $$payload2.select_value = selectedResource;
      $$payload2.out.push(`<option value="all"${maybe_selected($$payload2, "all")}>All Resources</option><option value="AUTH"${maybe_selected($$payload2, "AUTH")}>Authentication</option><option value="USER"${maybe_selected($$payload2, "USER")}>User Management</option><option value="TRIP"${maybe_selected($$payload2, "TRIP")}>Trip Management</option><option value="DATABASE"${maybe_selected($$payload2, "DATABASE")}>Database</option><option value="SYSTEM"${maybe_selected($$payload2, "SYSTEM")}>System</option>`);
      $$payload2.select_value = void 0;
      $$payload2.out.push(`</select> <select class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">`);
      $$payload2.select_value = selectedStatus;
      $$payload2.out.push(`<option value="all"${maybe_selected($$payload2, "all")}>All Status</option><option value="SUCCESS"${maybe_selected($$payload2, "SUCCESS")}>Success</option><option value="FAILED"${maybe_selected($$payload2, "FAILED")}>Failed</option>`);
      $$payload2.select_value = void 0;
      $$payload2.out.push(`</select> <select class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">`);
      $$payload2.select_value = selectedDateRange;
      $$payload2.out.push(`<option value="24h"${maybe_selected($$payload2, "24h")}>Last 24 Hours</option><option value="7d"${maybe_selected($$payload2, "7d")}>Last 7 Days</option><option value="30d"${maybe_selected($$payload2, "30d")}>Last 30 Days</option><option value="90d"${maybe_selected($$payload2, "90d")}>Last 90 Days</option>`);
      $$payload2.select_value = void 0;
      $$payload2.out.push(`</select> <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">`);
      Download($$payload2, { class: "w-4 h-4" });
      $$payload2.out.push(`<!----> <span>Export</span></button></div></div></div> <div class="bg-white shadow rounded-lg overflow-hidden"><div class="px-6 py-4 border-b border-gray-200"><div class="flex items-center justify-between"><h2 class="text-lg font-medium text-gray-900">Activity Logs</h2> <span class="text-sm text-gray-500">${escape_html(filteredLogs.length)} entries</span></div></div> <div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead><tbody class="bg-white divide-y divide-gray-200"><!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let log = each_array[$$index];
        const ResourceIcon = getResourceIcon(log.resource);
        $$payload2.out.push(`<tr class="hover:bg-gray-50"><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><div class="flex items-center">`);
        Calendar($$payload2, { class: "w-4 h-4 text-gray-400 mr-2" });
        $$payload2.out.push(`<!----> ${escape_html(log.timestamp)}</div></td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${escape_html(log.user)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${escape_html(log.action)}</span></td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><div class="flex items-center"><!---->`);
        ResourceIcon($$payload2, { class: "w-4 h-4 text-gray-600 mr-2" });
        $$payload2.out.push(`<!----> ${escape_html(log.resource)}</div></td><td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">${escape_html(log.details)}</td><td class="px-6 py-4 whitespace-nowrap"><span${attr_class(`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stringify(getStatusColor(log.status))}`)}>${escape_html(log.status)}</span></td><td class="px-6 py-4 whitespace-nowrap text-sm font-medium"><button class="text-blue-600 hover:text-blue-900 transition-colors">`);
        Eye($$payload2, { class: "w-4 h-4" });
        $$payload2.out.push(`<!----></button></td></tr>`);
      }
      $$payload2.out.push(`<!--]--></tbody></table></div></div></div></div> `);
      {
        $$payload2.out.push("<!--[!-->");
      }
      $$payload2.out.push(`<!--]-->`);
    }
  });
  pop();
}
export {
  _page as default
};
