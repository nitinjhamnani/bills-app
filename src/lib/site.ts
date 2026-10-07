export const SITE = {
  name: "Paytrix",
  phoneDisplay: "+91 96901 66444",
  phoneTel: "+919690166444",
  email: "treewealthmanagement@gmail.com",
  addressLines: [
    "Ground floor, Nayi Duniya Complex",
    "Agra Road, Aligarh",
    "Uttar Pradesh 202001",
  ],
  locality: "Aligarh",
  region: "Uttar Pradesh",
  postalCode: "202001",
  country: "India",
  mapsQuery: "Ground floor, Nayi Duniya Complex, Agra Road, Aligarh, Uttar Pradesh 202001",
} as const;

export const SITE_DESCRIPTION =
  "Paytrix is a B2B bill payments platform for organisations and companies in India. Fetch, pay, and settle electricity, water, gas, broadband, mobile, DTH, and other utility bills from one workspace.";

export function mapsUrl() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.mapsQuery)}`;
}
