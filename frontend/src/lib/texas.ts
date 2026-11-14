// Approximate rectangle containing Texas. Used only to notify the user;
// this is not an exact state boundary.
export function isInsideTexas(lat: number, lon: number): boolean {
  return lat >= 25.8 && lat <= 36.6 && lon >= -106.7 && lon <= -93.5;
}
