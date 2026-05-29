import { LatLngPoint } from '../types';

const EARTH_RADIUS_METRES = 6371000;

export function calculateBearingDegrees(start: LatLngPoint, end: LatLngPoint): number {
  const startLat = toRadians(start.lat);
  const endLat = toRadians(end.lat);
  const longitudeDelta = toRadians(end.lng - start.lng);

  const y = Math.sin(longitudeDelta) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(longitudeDelta);
  const bearing = toDegrees(Math.atan2(y, x));

  return normaliseAzimuth(bearing);
}

export function calculateDistanceMetres(start: LatLngPoint, end: LatLngPoint): number {
  const startLat = toRadians(start.lat);
  const endLat = toRadians(end.lat);
  const latitudeDelta = toRadians(end.lat - start.lat);
  const longitudeDelta = toRadians(end.lng - start.lng);

  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METRES * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function calculateDestinationPoint(start: LatLngPoint, distanceMetres: number, bearingDegrees: number): LatLngPoint {
  const bearingRadians = toRadians(bearingDegrees);
  const startLat = toRadians(start.lat);
  const startLng = toRadians(start.lng);
  const angularDistance = distanceMetres / EARTH_RADIUS_METRES;

  const endLat = Math.asin(
    Math.sin(startLat) * Math.cos(angularDistance)
    + Math.cos(startLat) * Math.sin(angularDistance) * Math.cos(bearingRadians)
  );

  const endLng = startLng + Math.atan2(
    Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(startLat),
    Math.cos(angularDistance) - Math.sin(startLat) * Math.sin(endLat)
  );

  return {
    lat: toDegrees(endLat),
    lng: ((toDegrees(endLng) + 540) % 360) - 180
  };
}

export function normaliseAzimuth(value: number): number {
  return Math.round((((value % 360) + 360) % 360) * 10) / 10;
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

function toDegrees(value: number): number {
  return value * 180 / Math.PI;
}
