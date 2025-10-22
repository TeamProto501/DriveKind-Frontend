// src/routes/dispatcher/rides/create-with-client/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	try {
		const formData = await event.request.json();

		// Create Supabase client
		const supabase = createSupabaseServerClient(event);

		// Get the current user (dispatcher)
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			console.error('User error:', userError);
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get the dispatcher's profile to verify role and get org_id
		const { data: profile, error: profileError } = await supabase
			.from('staff_profiles')
			.select('user_id, org_id, role')
			.eq('user_id', user.id)
			.single();

		if (profileError || !profile) {
			console.error('Profile error:', profileError);
			return json({ error: 'Profile not found' }, { status: 404 });
		}

		// Check if user has dispatcher or admin role
		const hasDispatcherRole = profile.role && (
			Array.isArray(profile.role) 
				? (profile.role.includes('Dispatcher') || profile.role.includes('Admin'))
				: (profile.role === 'Dispatcher' || profile.role === 'Admin')
		);

		if (!hasDispatcherRole) {
			return json({ error: 'Access denied. Dispatcher or Admin role required.' }, { status: 403 });
		}

		console.log('Creating client and ride with data:', formData);

		// Step 1: Create or find the client
		// First, check if client already exists by name and address
		const { data: existingClients, error: searchError } = await supabase
			.from('client_profiles')
			.select('client_id, user_id, first_name, last_name, street_address')
			.eq('first_name', formData.firstName)
			.eq('last_name', formData.lastName)
			.eq('org_id', profile.org_id);

		if (searchError) {
			console.error('Error searching for existing client:', searchError);
		}

		let clientId: number;

		// If client exists, use their ID; otherwise create new client
		if (existingClients && existingClients.length > 0) {
			// Use the first matching client
			clientId = existingClients[0].client_id;
			console.log('Using existing client:', clientId);

			// Update client's special requirements
			const { error: updateError } = await supabase
				.from('client_profiles')
				.update({
					mobility_assistance: formData.mobilityAssistance || null,
					other_limitations: formData.otherLimitations || null,
					car_height_needed: formData.carHeightNeeded || false,
					service_animal: formData.serviceAnimal || false,
					oxygen: formData.oxygen || false,
					allergies: formData.allergies || null,
					street_address: formData.streetAddress,
					address2: formData.address2 || null,
					city: formData.city,
					state: formData.state,
					zipcode: formData.zip
				})
				.eq('client_id', clientId);

			if (updateError) {
				console.error('Error updating client:', updateError);
			}
		} else {
			// Create a new client profile
			const { data: newClient, error: clientError } = await supabase
				.from('client_profiles')
				.insert({
					org_id: profile.org_id,
					first_name: formData.firstName,
					last_name: formData.lastName,
					street_address: formData.streetAddress,
					address2: formData.address2 || null,
					city: formData.city,
					state: formData.state,
					zipcode: formData.zip,
					mobility_assistance: formData.mobilityAssistance || null,
					other_limitations: formData.otherLimitations || null,
					car_height_needed: formData.carHeightNeeded || false,
					service_animal: formData.serviceAnimal || false,
					oxygen: formData.oxygen || false,
					allergies: formData.allergies || null,
					// Optional fields that might be added later
					primary_phone: null,
					secondary_phone: null,
					email: null
				})
				.select('client_id')
				.single();

			if (clientError) {
				console.error('Error creating client:', clientError);
				return json({ error: `Failed to create client: ${clientError.message}` }, { status: 500 });
			}

			clientId = newClient.client_id;
			console.log('Created new client:', clientId);
		}

		// Step 2: Determine pickup address
		const pickupFromHome = formData.useClientAddress;
		const pickupAddress = pickupFromHome ? formData.streetAddress : formData.pickupAddress;
		const pickupAddress2 = pickupFromHome ? formData.address2 : formData.pickupAddress2;
		const pickupCity = pickupFromHome ? formData.city : formData.pickupCity;
		const pickupState = pickupFromHome ? formData.state : formData.pickupState;
		const pickupZip = pickupFromHome ? formData.zip : formData.pickupZip;

		// Step 3: Create the ride
		const appointmentDateTime = `${formData.rideDate}T${formData.rideTime}:00`;

		const { data: ride, error: rideError } = await supabase
			.from('rides')
			.insert({
				org_id: profile.org_id,
				client_id: clientId,
				dispatcher_user_id: user.id,
				purpose: formData.purpose,
				destination_name: formData.destinationName || 'Destination',
				
				// Dropoff location
				dropoff_address: formData.dropoffAddress,
				dropoff_address2: formData.dropoffAddress2 || null,
				dropoff_city: formData.dropoffCity,
				dropoff_state: formData.dropoffState,
				dropoff_zipcode: formData.dropoffZip,
				
				// Pickup location
				pickup_from_home: pickupFromHome,
				alt_pickup_address: pickupFromHome ? null : pickupAddress,
				alt_pickup_address2: pickupFromHome ? null : pickupAddress2,
				alt_pickup_city: pickupFromHome ? null : pickupCity,
				alt_pickup_state: pickupFromHome ? null : pickupState,
				alt_pickup_zipcode: pickupFromHome ? null : pickupZip,
				
				// Schedule
				appointment_time: appointmentDateTime,
				estimated_appointment_length: formData.estimatedDuration || null,
				
				// Trip details
				round_trip: formData.roundTrip || false,
				riders: parseInt(formData.numberOfRiders) || 1,
				
				// Additional info
				notes: formData.notes || null,
				donation: false, // Can be updated later
				status: 'Requested'
			})
			.select(`
				*,
				clients:client_profiles!rides_client_id_fkey (
					client_id,
					first_name,
					last_name,
					street_address,
					city,
					state,
					zipcode,
					mobility_assistance,
					car_height_needed,
					service_animal,
					oxygen,
					allergies
				)
			`)
			.single();

		if (rideError) {
			console.error('Error creating ride:', rideError);
			return json({ error: `Failed to create ride: ${rideError.message}` }, { status: 500 });
		}

		console.log('Ride created successfully:', ride);

		// Step 4: Return the ride data along with matching suggestions
		// You can expand this to include driver matching logic
		return json({ 
			success: true, 
			ride,
			clientId,
			message: 'Ride created successfully. Ready to match with drivers.'
		});

	} catch (error: any) {
		console.error('Error in ride creation with client:', error);
		return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
	}
};
