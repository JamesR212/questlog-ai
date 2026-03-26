import type { LeaderboardEntry, LeaderboardCategory } from './leaderboard';

const TODAY = new Date().toISOString().slice(0, 10);
const NOW   = new Date().toISOString();

function mk(
  id: string, displayName: string,
  category: LeaderboardCategory, value: number, unit: string,
  status: 'ai_verified' | 'gps' | 'synced',
  lat: number, lng: number,
): LeaderboardEntry {
  return {
    id, userId: `demo_${id}`, displayName, category, value, unit,
    verificationStatus: status,
    verificationNote: status === 'ai_verified' ? 'AI verified lift' : status === 'gps' ? 'GPS tracked activity' : 'Synced from fitness tracker',
    lat, lng, locationFuzzed: true, date: TODAY, createdAt: NOW,
  };
}

export const DEMO_ENTRIES: Record<LeaderboardCategory, LeaderboardEntry[]> = {

  bench_press: [
    mk('bp1',  'Tom Bradley',      'bench_press', 72, 'kg', 'ai_verified', 53.482, -2.241),  // Manchester
    mk('bp2',  'Sarah Mitchell',   'bench_press', 41, 'kg', 'ai_verified', 51.512, -0.119),  // London
    mk('bp3',  'James Cooper',     'bench_press', 68, 'kg', 'ai_verified', 52.491, -1.885),  // Birmingham
    mk('bp4',  'Emma Davies',      'bench_press', 38, 'kg', 'ai_verified', 53.798, -1.553),  // Leeds
    mk('bp5',  'Oliver Hughes',    'bench_press', 55, 'kg', 'ai_verified', 51.458, -2.588),  // Bristol
    mk('bp6',  'Charlotte Evans',  'bench_press', 44, 'kg', 'ai_verified', 55.861, -4.248),  // Glasgow
    mk('bp7',  'Harry Wilson',     'bench_press', 79, 'kg', 'ai_verified', 55.958, -3.192),  // Edinburgh
    mk('bp8',  'Grace Thompson',   'bench_press', 36, 'kg', 'ai_verified', 53.411, -2.984),  // Liverpool
    mk('bp9',  'JamesW',           'bench_press', 62, 'kg', 'ai_verified', 53.629, -1.660),  // Wakefield
    mk('bp10', 'rachel',           'bench_press', 33, 'kg', 'ai_verified', 51.382, -2.362),  // Bath
    mk('bp11', 'spiderman7',       'bench_press', 75, 'kg', 'ai_verified', 52.913, -1.184),  // Derby
    mk('bp12', 'pJ07',             'bench_press', 48, 'kg', 'ai_verified', 53.043, -2.992),  // Warrington
    mk('bp13', 'DanT92',           'bench_press', 57, 'kg', 'ai_verified', 51.880, -0.420),  // Luton
  ],

  deadlift: [
    mk('dl1',  'Liam Morris',      'deadlift', 95,  'kg', 'ai_verified', 53.385, -1.468),  // Sheffield
    mk('dl2',  'Olivia Brown',     'deadlift', 62,  'kg', 'ai_verified', 54.981, -1.615),  // Newcastle
    mk('dl3',  'Noah Taylor',      'deadlift', 88,  'kg', 'ai_verified', 51.485, -3.178),  // Cardiff
    mk('dl4',  'Amelia White',     'deadlift', 55,  'kg', 'ai_verified', 52.957, -1.154),  // Nottingham
    mk('dl5',  'George Harris',    'deadlift', 102, 'kg', 'ai_verified', 52.639, -1.136),  // Leicester
    mk('dl6',  'Chloe Martin',     'deadlift', 48,  'kg', 'ai_verified', 51.754, -1.255),  // Oxford
    mk('dl7',  'Ryan Clarke',      'deadlift', 78,  'kg', 'ai_verified', 52.207, 0.124),   // Cambridge
    mk('dl8',  'Zoe Campbell',     'deadlift', 58,  'kg', 'ai_verified', 50.913, -1.402),  // Southampton
    mk('dl9',  'mikelifts',        'deadlift', 92,  'kg', 'ai_verified', 53.800, -3.048),  // Preston
    mk('dl10', 'kirsty_k',         'deadlift', 52,  'kg', 'ai_verified', 51.621, -3.944),  // Swansea
    mk('dl11', 'spiderman7',       'deadlift', 84,  'kg', 'ai_verified', 52.913, -1.184),  // Derby
    mk('dl12', 'JamesW',           'deadlift', 98,  'kg', 'ai_verified', 53.629, -1.660),  // Wakefield
    mk('dl13', 'b3nfit',           'deadlift', 67,  'kg', 'ai_verified', 51.509, -0.118),  // London E
  ],

  squat: [
    mk('sq1',  'Tom Bradley',      'squat', 80,  'kg', 'ai_verified', 53.482, -2.241),  // Manchester
    mk('sq2',  'Sarah Mitchell',   'squat', 48,  'kg', 'ai_verified', 51.512, -0.119),  // London
    mk('sq3',  'Liam Morris',      'squat', 91,  'kg', 'ai_verified', 53.385, -1.468),  // Sheffield
    mk('sq4',  'Emma Davies',      'squat', 52,  'kg', 'ai_verified', 53.798, -1.553),  // Leeds
    mk('sq5',  'Noah Taylor',      'squat', 75,  'kg', 'ai_verified', 51.485, -3.178),  // Cardiff
    mk('sq6',  'Amelia White',     'squat', 44,  'kg', 'ai_verified', 52.957, -1.154),  // Nottingham
    mk('sq7',  'George Harris',    'squat', 84,  'kg', 'ai_verified', 52.639, -1.136),  // Leicester
    mk('sq8',  'Chloe Martin',     'squat', 57,  'kg', 'ai_verified', 51.754, -1.255),  // Oxford
    mk('sq9',  'pJ07',             'squat', 70,  'kg', 'ai_verified', 53.043, -2.992),  // Warrington
    mk('sq10', 'rachel',           'squat', 46,  'kg', 'ai_verified', 51.382, -2.362),  // Bath
    mk('sq11', 'TommoUK',          'squat', 88,  'kg', 'ai_verified', 54.601, -5.930),  // Belfast
    mk('sq12', 'DanT92',           'squat', 63,  'kg', 'ai_verified', 51.880, -0.420),  // Luton
    mk('sq13', 'mikelifts',        'squat', 79,  'kg', 'ai_verified', 53.800, -3.048),  // Preston
  ],

  curl: [
    mk('cu1',  'James Cooper',     'curl', 18, 'kg', 'ai_verified', 52.491, -1.885),  // Birmingham
    mk('cu2',  'Charlotte Evans',  'curl',  9, 'kg', 'ai_verified', 55.861, -4.248),  // Glasgow
    mk('cu3',  'Harry Wilson',     'curl', 22, 'kg', 'ai_verified', 55.958, -3.192),  // Edinburgh
    mk('cu4',  'Grace Thompson',   'curl', 11, 'kg', 'ai_verified', 53.411, -2.984),  // Liverpool
    mk('cu5',  'Oliver Hughes',    'curl', 16, 'kg', 'ai_verified', 51.458, -2.588),  // Bristol
    mk('cu6',  'Ryan Clarke',      'curl', 20, 'kg', 'ai_verified', 52.207, 0.124),   // Cambridge
    mk('cu7',  'Zoe Campbell',     'curl', 12, 'kg', 'ai_verified', 50.913, -1.402),  // Southampton
    mk('cu8',  'Olivia Brown',     'curl', 14, 'kg', 'ai_verified', 54.981, -1.615),  // Newcastle
    mk('cu9',  'spiderman7',       'curl', 19, 'kg', 'ai_verified', 52.913, -1.184),  // Derby
    mk('cu10', 'kirsty_k',         'curl',  8, 'kg', 'ai_verified', 51.621, -3.944),  // Swansea
    mk('cu11', 'JamesW',           'curl', 17, 'kg', 'ai_verified', 53.629, -1.660),  // Wakefield
    mk('cu12', 'b3nfit',           'curl', 15, 'kg', 'ai_verified', 51.509, -0.118),  // London E
    mk('cu13', 'pJ07',             'curl', 21, 'kg', 'ai_verified', 53.043, -2.992),  // Warrington
  ],

  lat_pulldown: [
    mk('lp1',  'Tom Bradley',      'lat_pulldown', 58, 'kg', 'ai_verified', 53.482, -2.241),  // Manchester
    mk('lp2',  'Sarah Mitchell',   'lat_pulldown', 40, 'kg', 'ai_verified', 51.512, -0.119),  // London
    mk('lp3',  'Noah Taylor',      'lat_pulldown', 71, 'kg', 'ai_verified', 51.485, -3.178),  // Cardiff
    mk('lp4',  'Emma Davies',      'lat_pulldown', 44, 'kg', 'ai_verified', 53.798, -1.553),  // Leeds
    mk('lp5',  'Liam Morris',      'lat_pulldown', 65, 'kg', 'ai_verified', 53.385, -1.468),  // Sheffield
    mk('lp6',  'Chloe Martin',     'lat_pulldown', 47, 'kg', 'ai_verified', 51.754, -1.255),  // Oxford
    mk('lp7',  'Ryan Clarke',      'lat_pulldown', 68, 'kg', 'ai_verified', 52.207, 0.124),   // Cambridge
    mk('lp8',  'Amelia White',     'lat_pulldown', 52, 'kg', 'ai_verified', 52.957, -1.154),  // Nottingham
    mk('lp9',  'DanT92',           'lat_pulldown', 61, 'kg', 'ai_verified', 51.880, -0.420),  // Luton
    mk('lp10', 'TommoUK',          'lat_pulldown', 70, 'kg', 'ai_verified', 54.601, -5.930),  // Belfast
    mk('lp11', 'rachel',           'lat_pulldown', 38, 'kg', 'ai_verified', 51.382, -2.362),  // Bath
    mk('lp12', 'mikelifts',        'lat_pulldown', 64, 'kg', 'ai_verified', 53.800, -3.048),  // Preston
    mk('lp13', 'pJ07',             'lat_pulldown', 55, 'kg', 'ai_verified', 53.043, -2.992),  // Warrington
  ],

  cable_row: [
    mk('cr1',  'James Cooper',     'cable_row', 62, 'kg', 'ai_verified', 52.491, -1.885),  // Birmingham
    mk('cr2',  'Grace Thompson',   'cable_row', 42, 'kg', 'ai_verified', 53.411, -2.984),  // Liverpool
    mk('cr3',  'Harry Wilson',     'cable_row', 74, 'kg', 'ai_verified', 55.958, -3.192),  // Edinburgh
    mk('cr4',  'Charlotte Evans',  'cable_row', 38, 'kg', 'ai_verified', 55.861, -4.248),  // Glasgow
    mk('cr5',  'George Harris',    'cable_row', 66, 'kg', 'ai_verified', 52.639, -1.136),  // Leicester
    mk('cr6',  'Zoe Campbell',     'cable_row', 45, 'kg', 'ai_verified', 50.913, -1.402),  // Southampton
    mk('cr7',  'Oliver Hughes',    'cable_row', 58, 'kg', 'ai_verified', 51.458, -2.588),  // Bristol
    mk('cr8',  'Olivia Brown',     'cable_row', 50, 'kg', 'ai_verified', 54.981, -1.615),  // Newcastle
    mk('cr9',  'spiderman7',       'cable_row', 60, 'kg', 'ai_verified', 52.913, -1.184),  // Derby
    mk('cr10', 'kirsty_k',         'cable_row', 36, 'kg', 'ai_verified', 51.621, -3.944),  // Swansea
    mk('cr11', 'b3nfit',           'cable_row', 55, 'kg', 'ai_verified', 51.509, -0.118),  // London E
    mk('cr12', 'TommoUK',          'cable_row', 68, 'kg', 'ai_verified', 54.601, -5.930),  // Belfast
    mk('cr13', 'DanT92',           'cable_row', 48, 'kg', 'ai_verified', 51.880, -0.420),  // Luton
  ],

  longest_run: [
    mk('lr1',  'Tom Bradley',      'longest_run', 5.2, 'km', 'gps', 53.482, -2.241),  // Manchester
    mk('lr2',  'Sarah Mitchell',   'longest_run', 3.8, 'km', 'gps', 51.512, -0.119),  // London
    mk('lr3',  'Emma Davies',      'longest_run', 6.7, 'km', 'gps', 53.798, -1.553),  // Leeds
    mk('lr4',  'Amelia White',     'longest_run', 4.4, 'km', 'gps', 52.957, -1.154),  // Nottingham
    mk('lr5',  'Noah Taylor',      'longest_run', 8.1, 'km', 'gps', 51.485, -3.178),  // Cardiff
    mk('lr6',  'Ryan Clarke',      'longest_run', 5.9, 'km', 'gps', 52.207, 0.124),   // Cambridge
    mk('lr7',  'Chloe Martin',     'longest_run', 7.3, 'km', 'gps', 51.754, -1.255),  // Oxford
    mk('lr8',  'Liam Morris',      'longest_run', 4.1, 'km', 'gps', 53.385, -1.468),  // Sheffield
    mk('lr9',  'JamesW',           'longest_run', 5.6, 'km', 'gps', 53.629, -1.660),  // Wakefield
    mk('lr10', 'rachel',           'longest_run', 4.8, 'km', 'gps', 51.382, -2.362),  // Bath
    mk('lr11', 'DanT92',           'longest_run', 6.2, 'km', 'gps', 51.880, -0.420),  // Luton
    mk('lr12', 'kirsty_k',         'longest_run', 3.5, 'km', 'gps', 51.621, -3.944),  // Swansea
    mk('lr13', 'TommoUK',          'longest_run', 7.0, 'km', 'gps', 54.601, -5.930),  // Belfast
  ],

  steps_day: [
    // Brighton cluster (higher scorers)
    mk('sd1',  'Alex Turner',      'steps_day', 41252, 'steps', 'synced', 50.8461, -0.1402),  // Preston Park
    mk('sd2',  'Sophie Clarke',    'steps_day', 28940, 'steps', 'synced', 50.8355, -0.1724),  // Hove
    mk('sd3',  'Jamie Walsh',      'steps_day', 22105, 'steps', 'synced', 50.8298, -0.0981),  // Kemp Town
    mk('sd4',  'Priya Sharma',     'steps_day', 18430, 'steps', 'synced', 50.8629, -0.1533),  // Patcham
    mk('sd5',  'Callum Ross',      'steps_day', 14720, 'steps', 'synced', 50.8740, -0.0142),  // Lewes
    // UK-wide average entries
    mk('sd6',  'Harry Wilson',     'steps_day',  9320, 'steps', 'synced', 55.958, -3.192),  // Edinburgh
    mk('sd7',  'Grace Thompson',   'steps_day',  8240, 'steps', 'synced', 53.411, -2.984),  // Liverpool
    mk('sd8',  'Oliver Hughes',    'steps_day',  7850, 'steps', 'synced', 51.458, -2.588),  // Bristol
    mk('sd9',  'Charlotte Evans',  'steps_day',  7105, 'steps', 'synced', 55.861, -4.248),  // Glasgow
    mk('sd10', 'Olivia Brown',     'steps_day',  6780, 'steps', 'synced', 54.981, -1.615),  // Newcastle
    mk('sd11', 'Zoe Campbell',     'steps_day',  6420, 'steps', 'synced', 50.913, -1.402),  // Southampton
    mk('sd12', 'James Cooper',     'steps_day',  5930, 'steps', 'synced', 52.491, -1.885),  // Birmingham
    mk('sd13', 'spiderman7',       'steps_day', 11840, 'steps', 'synced', 52.913, -1.184),  // Derby
    mk('sd14', 'pJ07',             'steps_day',  8670, 'steps', 'synced', 53.043, -2.992),  // Warrington
    mk('sd15', 'b3nfit',           'steps_day',  9120, 'steps', 'synced', 51.509, -0.118),  // London E
    mk('sd16', 'mikelifts',        'steps_day',  7430, 'steps', 'synced', 53.800, -3.048),  // Preston
    mk('sd17', 'rachel',           'steps_day', 10250, 'steps', 'synced', 51.382, -2.362),  // Bath
  ],

  floors: [
    mk('fl1',  'George Harris',    'floors',  9,  'floors', 'gps', 52.639, -1.136),  // Leicester
    mk('fl2',  'Amelia White',     'floors', 12,  'floors', 'gps', 52.957, -1.154),  // Nottingham (hilly)
    mk('fl3',  'Noah Taylor',      'floors',  7,  'floors', 'gps', 51.485, -3.178),  // Cardiff
    mk('fl4',  'Chloe Martin',     'floors',  5,  'floors', 'gps', 51.754, -1.255),  // Oxford
    mk('fl5',  'Tom Bradley',      'floors', 11,  'floors', 'gps', 53.482, -2.241),  // Manchester
    mk('fl6',  'Emma Davies',      'floors',  6,  'floors', 'gps', 53.798, -1.553),  // Leeds
    mk('fl7',  'Ryan Clarke',      'floors',  8,  'floors', 'gps', 52.207, 0.124),   // Cambridge
    mk('fl8',  'Liam Morris',      'floors', 14,  'floors', 'gps', 53.385, -1.468),  // Sheffield (very hilly)
    mk('fl9',  'JamesW',           'floors',  7,  'floors', 'gps', 53.629, -1.660),  // Wakefield
    mk('fl10', 'DanT92',           'floors',  9,  'floors', 'gps', 51.880, -0.420),  // Luton
    mk('fl11', 'spiderman7',       'floors',  6,  'floors', 'gps', 52.913, -1.184),  // Derby
    mk('fl12', 'TommoUK',          'floors', 10,  'floors', 'gps', 54.601, -5.930),  // Belfast
    mk('fl13', 'kirsty_k',         'floors',  5,  'floors', 'gps', 51.621, -3.944),  // Swansea
  ],
};
