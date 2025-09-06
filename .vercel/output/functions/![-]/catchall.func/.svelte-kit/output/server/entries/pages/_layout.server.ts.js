import { c as createSupabaseServerClient } from "../../chunks/supabase.server.js";
const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error);
  }
  return {
    session
  };
};
export {
  load
};
