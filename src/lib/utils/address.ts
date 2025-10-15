// src/lib/utils/address.ts
import type { Feature } from '@geoapify/geocoder-autocomplete';

export interface ParsedAddress {
	street: string;
	city: string;
	state: string;
	zip: string;
	country: string;
	lat: number;
	lon: number;
}

export function parseGeoapifyAddress(feature: Feature): ParsedAddress {
	const properties = feature.properties;
	return {
		street: properties.address_line1 || '',
		city: properties.city || properties.town || properties.county || '',
		state: properties.state || '',
		zip: properties.postcode || '',
		country: properties.country || '',
		lat: properties.lat,
		lon: properties.lon
	};
}
