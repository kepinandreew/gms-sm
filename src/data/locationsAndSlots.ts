import { ServiceLocation, ServiceSlot } from '../types';

export function matchSlotId(slotA?: string, slotB?: string): boolean {
  if (!slotA || !slotB) return false;
  if (slotA === slotB) return true;

  const normalize = (id: string) => {
    return id
      .toLowerCase()
      .replace('barat-slot-a', 'barat-u1')
      .replace('barat-slot-b', 'barat-u2-u3')
      .replace('barat-slot-c', 'barat-u4-u5')
      .replace('timur-slot-a', 'timur-u1')
      .replace('timur-slot-b', 'timur-u2-u3')
      .replace('timur-slot-c', 'timur-u4-u5')
      .replace('selatan-slot-a', 'selatan-u1-u2')
      .replace('selatan-slot-b', 'selatan-u3-u4')
      .replace('selatan-u3-4', 'selatan-u3-u4')
      .replace('pusura-slot-a', 'pusura-u1-u2')
      .replace('english-slot-a', 'english-service');
  };

  return normalize(slotA) === normalize(slotB);
}

export const SERVICE_LOCATIONS: ServiceLocation[] = [
  {
    id: 'english',
    name: 'English Service',
    day: 'SATURDAY',
    color: 'bg-purple-500 text-white border-purple-600',
  },
  {
    id: 'barat',
    name: 'GMS Barat',
    day: 'SUNDAY',
    color: 'bg-blue-600 text-white border-blue-700',
  },
  {
    id: 'timur',
    name: 'GMS Timur',
    day: 'SUNDAY',
    color: 'bg-emerald-600 text-white border-emerald-700',
  },
  {
    id: 'selatan',
    name: 'GMS Selatan',
    day: 'SUNDAY',
    color: 'bg-amber-600 text-white border-amber-700',
  },
  {
    id: 'pusura',
    name: 'GMS Pusura',
    day: 'SUNDAY',
    color: 'bg-rose-600 text-white border-rose-700',
  },
];

export const SERVICE_SLOTS: ServiceSlot[] = [
  // English Service (Saturday)
  {
    id: 'english-service',
    location_id: 'english',
    name: 'English Service',
    day: 'SATURDAY',
    start_times: ['18:30'],
    required_teams: 1,
  },
  // GMS Barat (Sunday) - 3 slots
  {
    id: 'barat-u1',
    location_id: 'barat',
    name: 'Barat U1',
    day: 'SUNDAY',
    start_times: ['07:00'],
    required_teams: 1,
  },
  {
    id: 'barat-u2-u3',
    location_id: 'barat',
    name: 'Barat U2-U3',
    day: 'SUNDAY',
    start_times: ['10:00', '13:00'],
    required_teams: 1,
  },
  {
    id: 'barat-u4-u5',
    location_id: 'barat',
    name: 'Barat U4-U5',
    day: 'SUNDAY',
    start_times: ['16:00', '19:00'],
    required_teams: 1,
  },
  // GMS Timur (Sunday) - 3 slots
  {
    id: 'timur-u1',
    location_id: 'timur',
    name: 'Timur U1',
    day: 'SUNDAY',
    start_times: ['07:00'],
    required_teams: 1,
  },
  {
    id: 'timur-u2-u3',
    location_id: 'timur',
    name: 'Timur U2-U3',
    day: 'SUNDAY',
    start_times: ['10:00', '13:00'],
    required_teams: 1,
  },
  {
    id: 'timur-u4-u5',
    location_id: 'timur',
    name: 'Timur U4-U5',
    day: 'SUNDAY',
    start_times: ['16:00', '19:00'],
    required_teams: 1,
  },
  // GMS Selatan (Sunday) - 2 slots
  {
    id: 'selatan-u1-u2',
    location_id: 'selatan',
    name: 'Selatan U1-U2',
    day: 'SUNDAY',
    start_times: ['07:00', '10:00'],
    required_teams: 1,
  },
  {
    id: 'selatan-u3-u4',
    location_id: 'selatan',
    name: 'Selatan U3-U4',
    day: 'SUNDAY',
    start_times: ['13:00', '16:00'],
    required_teams: 1,
  },
  // GMS Pusura (Sunday) - 1 slot
  {
    id: 'pusura-u1-u2',
    location_id: 'pusura',
    name: 'Pusura U1-U2',
    day: 'SUNDAY',
    start_times: ['10:00', '13:00'],
    required_teams: 1,
  },
];
