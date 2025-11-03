export const actions = {
  createUser: async (event) => {
    console.log('=== CREATE USER ACTION STARTED ===');
    
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No session found');
      return { success: false, error: 'No session found' };
    }

    const formData = await event.request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const profileDataStr = formData.get('profileData') as string;
    
    console.log('Form data received:', { email, firstName, lastName });
    
    let profileData;
    try {
      profileData = JSON.parse(profileDataStr);
      console.log('Profile data parsed:', profileData);
    } catch (parseError) {
      console.error('Failed to parse profileData:', parseError);
      return { success: false, error: 'Invalid profile data format' };
    }

    try {
      // Create auth user
      console.log('Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email, 
        password, 
        email_confirm: true, 
        user_metadata: { first_name: firstName, last_name: lastName }
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        return { success: false, error: authError.message };
      }
      
      if (!authData.user) {
        console.error('No user returned from auth.admin.createUser');
        return { success: false, error: 'Failed to create user - no user data returned' };
      }
      
      console.log('Auth user created:', authData.user.id);

      // Create staff profile
      console.log('Creating staff profile...');
      const profilePayload = { 
        ...profileData, 
        user_id: authData.user.id,
        user_name: email.split('@')[0],  // Add username
        start_date: new Date().toISOString().split('T')[0]  // Add start date
      };
      
      console.log('Profile payload:', profilePayload);
      
      const res = await fetch(`${API_BASE_URL}/staff-profiles`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify(profilePayload)
      });
      
      console.log('Staff profile API response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Staff profile creation failed:', errorText);
        
        // Cleanup: delete the auth user
        console.log('Rolling back - deleting auth user...');
        await supabase.auth.admin.deleteUser(authData.user.id);
        
        return { success: false, error: `Failed to create staff profile: ${errorText}` };
      }
      
      const profileResult = await res.json();
      console.log('Staff profile created successfully:', profileResult);
      console.log('=== CREATE USER ACTION COMPLETED ===');
      
      return { success: true, userId: authData.user.id };
      
    } catch (err:any) {
      console.error('Unexpected error in createUser action:', err);
      return { success: false, error: err.message || 'Unknown error occurred' };
    }
  }
} satisfies Actions;