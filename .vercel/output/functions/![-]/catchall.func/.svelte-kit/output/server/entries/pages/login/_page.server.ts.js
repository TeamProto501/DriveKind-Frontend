import { r as redirect, f as fail } from "../../../chunks/index2.js";
import { c as createSupabaseServerClient } from "../../../chunks/supabase.server.js";
const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    throw redirect(302, "/");
  }
  return {};
};
const actions = {
  login: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    if (!email || !password) {
      return fail(400, {
        error: "Please fill in all fields",
        email
      });
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      return fail(400, {
        error: error.message,
        email
      });
    }
    throw redirect(302, "/");
  },
  logout: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { error } = await supabase.auth.signOut();
    if (error) {
      return fail(500, {
        error: "Error logging out"
      });
    }
    throw redirect(302, "/login");
  }
};
export {
  actions,
  load
};
