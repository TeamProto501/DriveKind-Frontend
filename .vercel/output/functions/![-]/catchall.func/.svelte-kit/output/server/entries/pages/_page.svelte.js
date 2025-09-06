import { J as attr, I as escape_html, E as pop, A as push } from "../../chunks/index.js";
import "../../chunks/client.js";
function _page($$payload, $$props) {
  push();
  let { data, form } = $$props;
  const session = data.session;
  let loading = false;
  let testLoading = false;
  $$payload.out.push(`<div class="min-h-screen bg-gray-50 p-8"><div class="max-w-4xl mx-auto"><h1 class="text-4xl font-bold text-gray-900 mb-8">Welcome to SvelteKit</h1> `);
  if (session) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="bg-white rounded-lg shadow p-6 mb-6"><h2 class="text-2xl font-semibold text-gray-800 mb-4">API Test</h2> <div class="space-y-4"><form method="POST" action="?/testProviders"><button type="submit"${attr("disabled", testLoading, true)} class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">${escape_html("Test Providers Endpoint")}</button></form> `);
    if (form?.error) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="bg-red-50 border border-red-200 rounded-md p-4"><p class="text-red-800 font-medium">Error:</p> <p class="text-red-700 text-sm mt-1">${escape_html(form.error)}</p></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
    if (form?.success && form?.data) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="bg-green-50 border border-green-200 rounded-md p-4"><p class="text-green-800 font-medium mb-2">Success! Providers data:</p> <pre class="text-green-700 text-sm bg-green-100 p-2 rounded overflow-x-auto">${escape_html(JSON.stringify(form.data, null, 2))}</pre></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div></div> <div class="bg-white rounded-lg shadow p-6 mb-6"><div class="flex justify-between items-start mb-4"><h2 class="text-2xl font-semibold text-gray-800">User Session Data</h2> <form method="POST" action="?/logout"><button type="submit"${attr("disabled", loading, true)} class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50">${escape_html("Logout")}</button></form></div> <div class="space-y-4"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="bg-gray-50 p-4 rounded-md"><h3 class="font-medium text-gray-700 mb-2">User ID</h3> <p class="text-sm text-gray-600 font-mono">${escape_html(session.user.id)}</p></div> <div class="bg-gray-50 p-4 rounded-md"><h3 class="font-medium text-gray-700 mb-2">Email</h3> <p class="text-sm text-gray-600">${escape_html(session.user.email)}</p></div> <div class="bg-gray-50 p-4 rounded-md"><h3 class="font-medium text-gray-700 mb-2">Created At</h3> <p class="text-sm text-gray-600">${escape_html(new Date(session.user.created_at).toLocaleString())}</p></div> <div class="bg-gray-50 p-4 rounded-md"><h3 class="font-medium text-gray-700 mb-2">Last Sign In</h3> <p class="text-sm text-gray-600">${escape_html(new Date(session.user.last_sign_in_at).toLocaleString())}</p></div></div> `);
    if (session.user.user_metadata && Object.keys(session.user.user_metadata).length > 0) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="bg-gray-50 p-4 rounded-md"><h3 class="font-medium text-gray-700 mb-2">User Metadata</h3> <pre class="text-sm text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">${escape_html(JSON.stringify(session.user.user_metadata, null, 2))}</pre></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
    if (session.user.app_metadata && Object.keys(session.user.app_metadata).length > 0) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="bg-gray-50 p-4 rounded-md"><h3 class="font-medium text-gray-700 mb-2">App Metadata</h3> <pre class="text-sm text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">${escape_html(JSON.stringify(session.user.app_metadata, null, 2))}</pre></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> <div class="bg-gray-50 p-4 rounded-md"><h3 class="font-medium text-gray-700 mb-2">Session Details</h3> <div class="space-y-2 text-sm text-gray-600"><div><span class="font-medium">Access Token Expires:</span> ${escape_html(new Date(session.expires_at * 1e3).toLocaleString())}</div> <div><span class="font-medium">Token Type:</span> ${escape_html(session.token_type)}</div></div></div> <details class="bg-gray-50 p-4 rounded-md"><summary class="font-medium text-gray-700 cursor-pointer">Raw Session Data</summary> <pre class="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">${escape_html(JSON.stringify(session, null, 2))}</pre></details></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="bg-white rounded-lg shadow p-6 text-center"><h2 class="text-2xl font-semibold text-gray-800 mb-4">Welcome!</h2> <p class="text-gray-600 mb-6">You are not currently logged in.</p> <a href="/login" class="inline-block px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Sign In</a></div>`);
  }
  $$payload.out.push(`<!--]--> <div class="mt-8 text-center"><p class="text-gray-500">Visit <a href="https://svelte.dev/docs/kit" class="text-indigo-600 hover:text-indigo-500">svelte.dev/docs/kit</a> to read the documentation</p></div></div></div>`);
  pop();
}
export {
  _page as default
};
