import{s as Ce}from"./DOOBv4HI.js";import{j as Ne,k as Te,l as Me,a as Q,c as ue}from"./BOZPY13N.js";import{j as Z,i as K,g as x,S as we,m as ye,aP as q,aQ as W,l as Ie,D as H,aR as de,aS as te,k as O,I as Ve,aT as se,h as D,G as $,q as fe,aU as B,aN as ce,ac as ke,ai as L,aV as xe,aW as He,aH as Re,aX as Oe,aM as Pe,aY as ze,az as he,e as X,aj as qe,T as ve,B as We,H as Le,C as le,F as R,o as w,aF as Fe,aJ as Ue,E as pe,v as j,aZ as Be,a_ as Ye,p as me,s as Ge,c as Qe,a as be,f as _e,r as Xe,u as Je,a$ as Ze}from"./4aDsAy4W.js";import{p as k,r as ge,s as Ke}from"./CUDZi8fW.js";import{d as oe}from"./Cnk5pdOU.js";function $e(a,e){return e}function je(a,e,r){for(var t=a.items,s=[],o=e.length,l=0;l<o;l++)Oe(e[l].e,s,!0);var c=o>0&&s.length===0&&r!==null;if(c){var m=r.parentNode;Pe(m),m.append(r),t.clear(),T(a,e[0].prev,e[o-1].next)}ze(s,()=>{for(var u=0;u<o;u++){var v=e[u];c||(t.delete(v.k),T(a,v.prev,v.next)),L(v.e,!c)}})}function er(a,e,r,t,s,o=null){var l=a,c={items:new Map,first:null},m=(e&de)!==0;if(m){var u=a;l=D?H(he(u)):u.appendChild(Z())}D&&X();var v=null,b=!1,p=new Map,E=we(()=>{var _=r();return qe(_)?_:_==null?[]:ce(_)}),i,h;function d(){rr(h,i,c,p,l,s,e,t,r),o!==null&&(i.length===0?v?$(v):v=O(()=>o(l)):v!==null&&fe(v,()=>{v=null}))}K(()=>{h??(h=ve),i=x(E);var _=i.length;if(b&&_===0)return;b=_===0;let g=!1;if(D){var C=We(l)===Le;C!==(_===0)&&(l=le(),H(l),R(!1),g=!0)}if(D){for(var M=null,A,n=0;n<_;n++){if(w.nodeType===Fe&&w.data===Ue){l=w,g=!0,R(!1);break}var f=i[n],S=t(f,n);A=J(w,c,M,null,f,S,n,s,e,r),c.items.set(S,A),M=A}_>0&&H(le())}if(D)_===0&&o&&(v=O(()=>o(l)));else if(ye()){var I=new Set,P=Ie;for(n=0;n<_;n+=1){f=i[n],S=t(f,n);var y=c.items.get(S)??p.get(S);y?e&(q|W)&&Ae(y,f,n,e):(A=J(null,c,null,null,f,S,n,s,e,r,!0),p.set(S,A)),I.add(S)}for(const[N,z]of c.items)I.has(N)||P.skipped_effects.add(z.e);P.add_callback(d)}else d();g&&R(!0),x(E)}),D&&(l=w)}function rr(a,e,r,t,s,o,l,c,m){var ee,re,ae,ie;var u=(l&He)!==0,v=(l&(q|W))!==0,b=e.length,p=r.items,E=r.first,i=E,h,d=null,_,g=[],C=[],M,A,n,f;if(u)for(f=0;f<b;f+=1)M=e[f],A=c(M,f),n=p.get(A),n!==void 0&&((ee=n.a)==null||ee.measure(),(_??(_=new Set)).add(n));for(f=0;f<b;f+=1){if(M=e[f],A=c(M,f),n=p.get(A),n===void 0){var S=t.get(A);if(S!==void 0){t.delete(A),p.set(A,S);var I=d?d.next:i;T(r,d,S),T(r,S,I),Y(S,I,s),d=S}else{var P=i?i.e.nodes_start:s;d=J(P,r,d,d===null?r.first:d.next,M,A,f,o,l,m)}p.set(A,d),g=[],C=[],i=d.next;continue}if(v&&Ae(n,M,f,l),n.e.f&B&&($(n.e),u&&((re=n.a)==null||re.unfix(),(_??(_=new Set)).delete(n))),n!==i){if(h!==void 0&&h.has(n)){if(g.length<C.length){var y=C[0],N;d=y.prev;var z=g[0],F=g[g.length-1];for(N=0;N<g.length;N+=1)Y(g[N],y,s);for(N=0;N<C.length;N+=1)h.delete(C[N]);T(r,z.prev,F.next),T(r,d,z),T(r,F,y),i=y,d=F,f-=1,g=[],C=[]}else h.delete(n),Y(n,i,s),T(r,n.prev,n.next),T(r,n,d===null?r.first:d.next),T(r,d,n),d=n;continue}for(g=[],C=[];i!==null&&i.k!==A;)i.e.f&B||(h??(h=new Set)).add(i),C.push(i),i=i.next;if(i===null)continue;n=i}g.push(n),d=n,i=n.next}if(i!==null||h!==void 0){for(var V=h===void 0?[]:ce(h);i!==null;)i.e.f&B||V.push(i),i=i.next;var U=V.length;if(U>0){var Se=l&de&&b===0?s:null;if(u){for(f=0;f<U;f+=1)(ae=V[f].a)==null||ae.measure();for(f=0;f<U;f+=1)(ie=V[f].a)==null||ie.fix()}je(r,V,Se)}}u&&ke(()=>{var ne;if(_!==void 0)for(n of _)(ne=n.a)==null||ne.apply()}),a.first=r.first&&r.first.e,a.last=d&&d.e;for(var Ee of t.values())L(Ee.e);t.clear()}function Ae(a,e,r,t){t&q&&te(a.v,e),t&W?te(a.i,r):a.i=r}function J(a,e,r,t,s,o,l,c,m,u,v){var b=(m&q)!==0,p=(m&xe)===0,E=b?p?Ve(s,!1,!1):se(s):s,i=m&W?se(l):l,h={i,v:E,k:o,a:null,e:null,prev:r,next:t};try{if(a===null){var d=document.createDocumentFragment();d.append(a=Z())}return h.e=O(()=>c(a,E,i,u),D),h.e.prev=r&&r.e,h.e.next=t&&t.e,r===null?v||(e.first=h):(r.next=h,r.e.next=h.e),t!==null&&(t.prev=h,t.e.prev=h.e),h}finally{}}function Y(a,e,r){for(var t=a.next?a.next.e.nodes_start:r,s=e?e.e.nodes_start:r,o=a.e.nodes_start;o!==null&&o!==t;){var l=Re(o);s.before(o),o=l}}function T(a,e,r){e===null?a.first=r:(e.next=r,e.e.next=r&&r.e),r!==null&&(r.prev=e,r.e.prev=e&&e.e)}function De(a,e,...r){var t=a,s=j,o;K(()=>{s!==(s=e())&&(o&&(L(o),o=null),o=O(()=>s(t,...r)))},pe),D&&(t=w)}function ar(a,e,r,t,s,o){let l=D;D&&X();var c,m,u=null;D&&w.nodeType===Be&&(u=w,X());var v=D?w:a,b;K(()=>{const p=e()||null;var E=Ye;p!==c&&(b&&(p===null?fe(b,()=>{b=null,m=null}):p===m?$(b):L(b)),p&&p!==m&&(b=O(()=>{if(u=D?u:document.createElementNS(E,p),Ne(u,u),t){D&&Te(p)&&u.append(document.createComment(""));var i=D?he(u):u.appendChild(Z());D&&(i===null?R(!1):H(i)),t(u,i)}ve.nodes_end=u,v.before(u)})),c=p,c&&(m=c))},pe),l&&(R(!0),H(v))}const ir=()=>{const a=Ce;return{page:{subscribe:a.page.subscribe},navigating:{subscribe:a.navigating.subscribe},updated:a.updated}},hr={subscribe(a){return ir().page.subscribe(a)}};/**
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
 */const nr={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};var tr=Me("<svg><!><!></svg>");function sr(a,e){me(e,!0);const r=k(e,"color",3,"currentColor"),t=k(e,"size",3,24),s=k(e,"strokeWidth",3,2),o=k(e,"absoluteStrokeWidth",3,!1),l=k(e,"iconNode",19,()=>[]),c=ge(e,["$$slots","$$events","$$legacy","name","color","size","strokeWidth","absoluteStrokeWidth","iconNode","children"]);var m=tr();oe(m,b=>({...nr,...c,width:t(),height:t(),stroke:r(),"stroke-width":b,class:["lucide-icon lucide",e.name&&`lucide-${e.name}`,e.class]}),[()=>o()?Number(s())*24/Number(t()):s()]);var u=Qe(m);er(u,17,l,$e,(b,p)=>{var E=Je(()=>Ze(x(p),2));let i=()=>x(E)[0],h=()=>x(E)[1];var d=ue(),_=_e(d);ar(_,i,!0,(g,C)=>{oe(g,()=>({...h()}))}),Q(b,d)});var v=Ge(u);De(v,()=>e.children??j),Xe(m),Q(a,m),be()}function vr(a,e){me(e,!0);/**
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
 */let r=ge(e,["$$slots","$$events","$$legacy"]);const t=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]];sr(a,Ke({name:"house"},()=>r,{get iconNode(){return t},children:(s,o)=>{var l=ue(),c=_e(l);De(c,()=>e.children??j),Q(s,l)},$$slots:{default:!0}})),be()}const lr=[{label:"Dashboard",href:"/super-admin/dashboard",icon:"🏢",roles:["Super Admin"]},{label:"Organizations",href:"/super-admin/organizations",icon:"🏛️",roles:["Super Admin"]},{label:"Create Organization",href:"/super-admin/create-organization",icon:"➕",roles:["Super Admin"]},{label:"System Users",href:"/super-admin/users",icon:"👥",roles:["Super Admin"]},{label:"Dashboard",href:"/admin/dash",icon:"📊",roles:["Admin"]},{label:"User Management",href:"/admin/users",icon:"👥",roles:["Admin"]},{label:"Database Management",href:"/admin/database",icon:"🗄️",roles:["Admin"]},{label:"System Configuration",href:"/admin/config",icon:"⚙️",roles:["Admin"]},{label:"Trip Reports",href:"/admin/reports",icon:"📈",roles:["Admin"]},{label:"Audit Logs",href:"/admin/audit",icon:"📋",roles:["Admin"]},{label:"Dashboard",href:"/dispatcher/dashboard",icon:"🚗",roles:["Dispatcher"]},{label:"Ride Requests",href:"/dispatcher/requests",icon:"📋",roles:["Dispatcher"]},{label:"Trip Database",href:"/dispatcher/trips",icon:"🗃️",roles:["Dispatcher"]},{label:"Schedule Management",href:"/dispatcher/schedule",icon:"📅",roles:["Dispatcher"]},{label:"Driver Management",href:"/dispatcher/drivers",icon:"👨‍✈️",roles:["Dispatcher"]},{label:"Client Management",href:"/dispatcher/clients",icon:"👤",roles:["Dispatcher"]},{label:"Volunteer Management",href:"/dispatcher/volunteers",icon:"🤝",roles:["Dispatcher"]},{label:"Dashboard",href:"/driver/dashboard",icon:"🚙",roles:["Driver"]},{label:"My Schedule",href:"/driver/schedule",icon:"📅",roles:["Driver"]},{label:"Submit Availability",href:"/driver/availability",icon:"⏰",roles:["Driver"]},{label:"Post-Trip Data",href:"/driver/post-trip",icon:"✅",roles:["Driver"]},{label:"Completed Rides",href:"/driver/completed",icon:"🛣️",roles:["Driver"]},{label:"My Profile",href:"/driver/profile",icon:"👤",roles:["Driver"]},{label:"Dashboard",href:"/volunteer/dashboard",icon:"🤝",roles:["Volunteer"]},{label:"Registration",href:"/volunteer/registration",icon:"📝",roles:["Volunteer"]},{label:"Available Opportunities",href:"/volunteer/opportunities",icon:"🌟",roles:["Volunteer"]},{label:"My Schedule",href:"/volunteer/schedule",icon:"📅",roles:["Volunteer"]},{label:"My Profile",href:"/volunteer/profile",icon:"👤",roles:["Volunteer"]},{label:"Profile",href:"/profile",icon:"👤",roles:["Super Admin","Admin","Dispatcher","Driver","Volunteer"]},{label:"Help & Support",href:"/help",icon:"❓",roles:["Super Admin","Admin","Dispatcher","Driver","Volunteer"]}],G={dispatcher:[{label:"Create Ride Request",href:"/dispatcher/requests/create",icon:"➕"},{label:"Assign Driver",href:"/dispatcher/schedule/assign",icon:"👨‍✈️"}],driver:[{label:"Submit Availability",href:"/driver/availability",icon:"⏰"},{label:"Post-Trip Data",href:"/driver/post-trip",icon:"✅"}],volunteer:[{label:"Submit Availability",href:"/volunteer/availability",icon:"⏰"},{label:"View Opportunities",href:"/volunteer/opportunities",icon:"🌟"}]};function pr(a){return!a||a.length===0?[]:lr.filter(e=>e.roles.some(r=>a.includes(r)))}function mr(a){if(!a||a.length===0)return[];const e=[];return a.includes("Dispatcher")&&e.push(...G.dispatcher),a.includes("Driver")&&e.push(...G.driver),a.includes("Volunteer")&&e.push(...G.volunteer),e}function br(a){if(!a||a.length===0)return"/";const e={"Super Admin":1,Admin:2,Dispatcher:3,Driver:4,Volunteer:5,Client:6};switch(a.reduce((t,s)=>e[s]<e[t]?s:t)){case"Super Admin":return"/super-admin/dashboard";case"Admin":return"/admin/dash";case"Dispatcher":return"/dispatcher/dashboard";case"Driver":return"/driver/dashboard";case"Volunteer":return"/volunteer/dashboard";case"Client":return"/";default:return"/"}}export{vr as H,sr as I,mr as a,pr as b,er as e,br as g,$e as i,hr as p,De as s};
