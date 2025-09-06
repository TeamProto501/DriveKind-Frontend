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
  signup: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    if (!email || !password || !confirmPassword) {
      return fail(400, {
        error: "Please fill in all fields",
        email
      });
    }
    if (password !== confirmPassword) {
      return fail(400, {
        error: "Passwords do not match",
        email
      });
    }
    if (password.length < 6) {
      return fail(400, {
        error: "Password must be at least 6 characters long",
        email
      });
    }
    const { error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) {
      return fail(400, {
        error: error.message,
        email
      });
    }
    return {
      message: "Check your email for confirmation link",
      email
    };
  }
};
export {
  actions,
  load
};
