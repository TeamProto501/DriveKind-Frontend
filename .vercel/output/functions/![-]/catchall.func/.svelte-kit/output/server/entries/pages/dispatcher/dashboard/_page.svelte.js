import { A as push, F as spread_props, E as pop, K as ensure_array_like, M as maybe_selected, I as escape_html, N as attr_class, O as stringify } from "../../../../chunks/index.js";
import { R as RoleGuard, B as Breadcrumbs } from "../../../../chunks/Breadcrumbs.js";
import { C as Car } from "../../../../chunks/car.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { U as Users, P as Plus } from "../../../../chunks/users.js";
import { S as Search } from "../../../../chunks/search.js";
import { C as Calendar } from "../../../../chunks/calendar.js";
function Circle_alert($$payload, $$props) {
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
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["line", { "x1": "12", "x2": "12", "y1": "8", "y2": "12" }],
    [
      "line",
      { "x1": "12", "x2": "12.01", "y1": "16", "y2": "16" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "circle-alert" },
    /**
     * @component @name CircleAlert
     * @description Lucide SVG icon component, renders SVG Element with children.
     *
     * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8bGluZSB4MT0iMTIiIHgyPSIxMiIgeTE9IjgiIHkyPSIxMiIgLz4KICA8bGluZSB4MT0iMTIiIHgyPSIxMi4wMSIgeTE9IjE2IiB5Mj0iMTYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/circle-alert
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
function Circle_check_big($$payload, $$props) {
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
    ["path", { "d": "M21.801 10A10 10 0 1 1 17 3.335" }],
    ["path", { "d": "m9 11 3 3L22 4" }]
  ];
  Icon($$payload, spread_props([
    { name: "circle-check-big" },
    /**
     * @component @name CircleCheckBig
     * @description Lucide SVG icon component, renders SVG Element with children.
     *
     * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEuODAxIDEwQTEwIDEwIDAgMSAxIDE3IDMuMzM1IiAvPgogIDxwYXRoIGQ9Im05IDExIDMgM0wyMiA0IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/circle-check-big
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
function Clock($$payload, $$props) {
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
    ["path", { "d": "M12 6v6l4 2" }],
    ["circle", { "cx": "12", "cy": "12", "r": "10" }]
  ];
  Icon($$payload, spread_props([
    { name: "clock" },
    /**
     * @component @name Clock
     * @description Lucide SVG icon component, renders SVG Element with children.
     *
     * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgNnY2bDQgMiIgLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/clock
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
function Map_pin($$payload, $$props) {
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
    [
      "path",
      {
        "d": "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
      }
    ],
    ["circle", { "cx": "12", "cy": "10", "r": "3" }]
  ];
  Icon($$payload, spread_props([
    { name: "map-pin" },
    /**
     * @component @name MapPin
     * @description Lucide SVG icon component, renders SVG Element with children.
     *
     * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgMTBjMCA0Ljk5My01LjUzOSAxMC4xOTMtNy4zOTkgMTEuNzk5YTEgMSAwIDAgMS0xLjIwMiAwQzkuNTM5IDIwLjE5MyA0IDE0Ljk5MyA0IDEwYTggOCAwIDAgMSAxNiAwIiAvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/map-pin
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
function _page($$payload) {
  let rideRequests = [
    {
      id: 1,
      client: "John Smith",
      pickup: "123 Main St",
      dropoff: "456 Oak Ave",
      time: "2:00 PM",
      status: "Pending"
    },
    {
      id: 2,
      client: "Jane Doe",
      pickup: "789 Pine Rd",
      dropoff: "321 Elm St",
      time: "3:30 PM",
      status: "Assigned"
    },
    {
      id: 3,
      client: "Bob Johnson",
      pickup: "654 Maple Dr",
      dropoff: "987 Cedar Ln",
      time: "4:15 PM",
      status: "In Progress"
    }
  ];
  let selectedStatus = "all";
  const filteredRequests = rideRequests;
  function getStatusColor(status) {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Assigned":
        return "bg-blue-100 text-blue-800";
      case "In Progress":
        return "bg-orange-100 text-orange-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }
  RoleGuard($$payload, {
    requiredRoles: ["Dispatcher"],
    children: ($$payload2) => {
      const each_array = ensure_array_like(filteredRequests);
      $$payload2.out.push(`<div class="min-h-screen bg-gray-50">`);
      Breadcrumbs($$payload2);
      $$payload2.out.push(`<!----> <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div class="mb-8"><div class="flex items-center justify-between"><div><h1 class="text-3xl font-bold text-gray-900">Dispatcher Dashboard</h1> <p class="text-gray-600 mt-2">Manage ride requests, assign drivers, and monitor trip progress.</p></div> <div class="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-full">`);
      Car($$payload2, { class: "w-5 h-5 text-green-600" });
      $$payload2.out.push(`<!----> <span class="text-sm font-medium text-green-800">Dispatcher</span></div></div></div> <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"><div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"><div class="flex items-center"><div class="p-2 bg-blue-100 rounded-lg">`);
      Circle_alert($$payload2, { class: "w-6 h-6 text-blue-600" });
      $$payload2.out.push(`<!----></div> <div class="ml-4"><p class="text-sm font-medium text-gray-500">Pending Requests</p> <p class="text-2xl font-semibold text-gray-900">5</p></div></div></div> <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"><div class="flex items-center"><div class="p-2 bg-green-100 rounded-lg">`);
      Circle_check_big($$payload2, { class: "w-6 h-6 text-green-600" });
      $$payload2.out.push(`<!----></div> <div class="ml-4"><p class="text-sm font-medium text-gray-500">Assigned Rides</p> <p class="text-2xl font-semibold text-gray-900">12</p></div></div></div> <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"><div class="flex items-center"><div class="p-2 bg-orange-100 rounded-lg">`);
      Clock($$payload2, { class: "w-6 h-6 text-orange-600" });
      $$payload2.out.push(`<!----></div> <div class="ml-4"><p class="text-sm font-medium text-gray-500">In Progress</p> <p class="text-2xl font-semibold text-gray-900">3</p></div></div></div> <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"><div class="flex items-center"><div class="p-2 bg-purple-100 rounded-lg">`);
      Users($$payload2, { class: "w-6 h-6 text-purple-600" });
      $$payload2.out.push(`<!----></div> <div class="ml-4"><p class="text-sm font-medium text-gray-500">Active Drivers</p> <p class="text-2xl font-semibold text-gray-900">8</p></div></div></div></div> <div class="bg-white rounded-lg border border-gray-200 shadow-sm"><div class="px-6 py-4 border-b border-gray-200"><div class="flex items-center justify-between"><h2 class="text-lg font-medium text-gray-900">Ride Requests</h2> <div class="flex items-center space-x-3"><div class="relative">`);
      Search($$payload2, {
        class: "w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
      });
      $$payload2.out.push(`<!----> <input type="text" placeholder="Search requests..." class="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/></div> <select class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">`);
      $$payload2.select_value = selectedStatus;
      $$payload2.out.push(`<option value="all"${maybe_selected($$payload2, "all")}>All Status</option><option value="Pending"${maybe_selected($$payload2, "Pending")}>Pending</option><option value="Assigned"${maybe_selected($$payload2, "Assigned")}>Assigned</option><option value="In Progress"${maybe_selected($$payload2, "In Progress")}>In Progress</option><option value="Completed"${maybe_selected($$payload2, "Completed")}>Completed</option>`);
      $$payload2.select_value = void 0;
      $$payload2.out.push(`</select> <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">`);
      Plus($$payload2, { class: "w-4 h-4" });
      $$payload2.out.push(`<!----> <span>New Request</span></button></div></div></div> <div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dropoff</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead><tbody class="bg-white divide-y divide-gray-200"><!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let request = each_array[$$index];
        $$payload2.out.push(`<tr class="hover:bg-gray-50"><td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${escape_html(request.id)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${escape_html(request.client)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div class="flex items-center">`);
        Map_pin($$payload2, { class: "w-4 h-4 text-gray-400 mr-2" });
        $$payload2.out.push(`<!----> ${escape_html(request.pickup)}</div></td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div class="flex items-center">`);
        Map_pin($$payload2, { class: "w-4 h-4 text-gray-400 mr-2" });
        $$payload2.out.push(`<!----> ${escape_html(request.dropoff)}</div></td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div class="flex items-center">`);
        Clock($$payload2, { class: "w-4 h-4 text-gray-400 mr-2" });
        $$payload2.out.push(`<!----> ${escape_html(request.time)}</div></td><td class="px-6 py-4 whitespace-nowrap"><span${attr_class(`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stringify(getStatusColor(request.status))}`)}>${escape_html(request.status)}</span></td><td class="px-6 py-4 whitespace-nowrap text-sm font-medium"><button class="text-blue-600 hover:text-blue-900 mr-3">Assign Driver</button> <button class="text-gray-600 hover:text-gray-900">View Details</button></td></tr>`);
      }
      $$payload2.out.push(`<!--]--></tbody></table></div></div> <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"><a href="/dispatcher/requests/create" class="group p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"><div class="flex items-center space-x-3"><div class="p-2 rounded-lg bg-blue-500 text-white">`);
      Plus($$payload2, { class: "w-6 h-6" });
      $$payload2.out.push(`<!----></div> <div><h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">Create Ride Request</h3> <p class="text-sm text-gray-500">Add new ride requests for clients</p></div></div></a> <a href="/dispatcher/schedule" class="group p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"><div class="flex items-center space-x-3"><div class="p-2 rounded-lg bg-green-500 text-white">`);
      Calendar($$payload2, { class: "w-6 h-6" });
      $$payload2.out.push(`<!----></div> <div><h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">Manage Schedule</h3> <p class="text-sm text-gray-500">View and manage driver schedules</p></div></div></a> <a href="/dispatcher/drivers" class="group p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"><div class="flex items-center space-x-3"><div class="p-2 rounded-lg bg-purple-500 text-white">`);
      Users($$payload2, { class: "w-6 h-6" });
      $$payload2.out.push(`<!----></div> <div><h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">Driver Management</h3> <p class="text-sm text-gray-500">Manage driver accounts and availability</p></div></div></a></div></div></div>`);
    }
  });
}
export {
  _page as default
};
