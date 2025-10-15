// src/lib/utils/address.ts

export interface ParsedAddress {
	street: string;
	city: string;
	state: string;
	zip: string;
	country: string;
	lat: number;
	lon: number;
}

// Interface for Geoapify Geocoding API response
export interface GeoapifyGeocodingResult {
	formatted: string;
	address_line1: string;
	address_line2?: string;
	city: string;
	state: string;
	postcode: string;
	country: string;
	lat: number;
	lon: number;
	street?: string;
	housenumber?: string;
}

export function parseGeoapifyAddress(result: GeoapifyGeocodingResult): ParsedAddress {
	return {
		street: result.address_line1 || result.street || '',
		city: result.city || '',
		state: result.state || '',
		zip: result.postcode || '',
		country: result.country || '',
		lat: result.lat,
		lon: result.lon
	};
}
