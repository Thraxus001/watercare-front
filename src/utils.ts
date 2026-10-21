export function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusMetres = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lon2 - lon1);
  const latitude1 = toRadians(lat1);
  const latitude2 = toRadians(lat2);
  const a = Math.min(1, Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2);
  return 2 * earthRadiusMetres * Math.asin(Math.sqrt(a));
}

export function parseCoord(val: unknown): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

export type GpsCoordinates = { latitude: number; longitude: number; accuracy: number };

export function requestGpsLocation(): Promise<GpsCoordinates> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("This browser does not support location access."));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      }),
      (error) => reject(new Error(
        error.code === error.PERMISSION_DENIED
          ? "Location access denied. Enable location permissions and try again."
          : "Unable to get your location. Check device GPS and try again.",
      )),
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 },
    );
  });
}
