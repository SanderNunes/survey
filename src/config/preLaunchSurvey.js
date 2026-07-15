export const PRELAUNCH_PROVINCES = ['Cabinda', 'Bié', 'Zaire', 'Namibe'];

export const PRELAUNCH_MUNICIPALITIES_BY_PROVINCE = {
  Cabinda: ['Cabinda'],
  'Bié': ['Kuito'],
  Zaire: ["M'banza Congo", 'Soyo'],
  Namibe: ['Namibe', 'Moçâmedes', 'Tômbwa'],
};

export const PRELAUNCH_PROVINCE_TARGETS = {
  Cabinda: 600,
  'Bié': 600,
  Zaire: 400,
  Namibe: 500,
};

export const PRELAUNCH_MUNICIPALITY_TARGETS = {
  Cabinda: 600,
  Kuito: 600,
  "M'banza Congo": 100,
  Soyo: 300,
  Namibe: 100,
  'Moçâmedes': 300,
  'Tômbwa': 100,
};

export const PRELAUNCH_TOTAL_TARGET = Object.values(PRELAUNCH_PROVINCE_TARGETS)
  .reduce((sum, target) => sum + target, 0);

export const PRELAUNCH_LIST_NAMES = {
  Cabinda: 'Cabinda_PreLaunch_Survey',
  'Bié': 'Bie_PreLaunch_Survey',
  Zaire: 'Zaire_PreLaunch_Survey',
  Namibe: 'Namibe_PreLaunch_Survey',
};

const normalizeProvinceKey = (value) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function normalizePreLaunchProvince(province) {
  const key = normalizeProvinceKey(province);
  return PRELAUNCH_PROVINCES.find((candidate) => normalizeProvinceKey(candidate) === key) || '';
}

export function getPreLaunchListName(province) {
  const normalizedProvince = normalizePreLaunchProvince(province);
  return normalizedProvince ? PRELAUNCH_LIST_NAMES[normalizedProvince] : undefined;
}
