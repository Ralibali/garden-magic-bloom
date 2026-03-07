// Temperature-based sowing advice for Swedish climate zones

interface WeatherTip {
  message: string;
  type: 'info' | 'warning' | 'success';
}

export function getTemperatureTips(tempC: number, climateZone: number, month: number): WeatherTip[] {
  const tips: WeatherTip[] = [];

  // Frost warnings
  if (tempC <= 0) {
    tips.push({ message: 'Frost! Ta in känsliga plantor och täck odlingar med fiberduk.', type: 'warning' });
  } else if (tempC <= 3) {
    tips.push({ message: 'Nära frostgränsen – skydda tomater, squash och andra frostkänsliga grödor i natt.', type: 'warning' });
  }

  // Spring sowing advice
  if (month >= 3 && month <= 5) {
    if (tempC >= 5 && tempC < 10) {
      tips.push({ message: 'Marken börjar värmas – du kan direktså rädisor, spenat och ärtor.', type: 'success' });
    } else if (tempC >= 10 && tempC < 15) {
      tips.push({ message: 'Bra temperatur för att så morötter, rödbetor och sallat utomhus.', type: 'success' });
    } else if (tempC >= 15) {
      tips.push({ message: 'Varmt nog att plantera ut tomater, gurka och bönor – om nätterna också håller sig varma.', type: 'success' });
    } else if (tempC < 5) {
      tips.push({ message: 'Fortfarande för kallt att så utomhus. Fokusera på förodling inomhus.', type: 'info' });
    }
  }

  // Summer care
  if (month >= 6 && month <= 8) {
    if (tempC >= 25) {
      tips.push({ message: 'Varmt! Vattna tidigt på morgonen eller sent på kvällen. Mulcha för att hålla fukt.', type: 'warning' });
    } else if (tempC >= 30) {
      tips.push({ message: 'Extrem värme – skugga känsliga grödor som sallat. Vattna extra.', type: 'warning' });
    }
    if (tempC >= 15 && tempC < 25) {
      tips.push({ message: 'Perfekt odlingsväder! Bra tid för gallring, ogräsrensning och successionssådd.', type: 'success' });
    }
  }

  // Autumn
  if (month >= 9 && month <= 11) {
    if (tempC >= 5 && tempC < 15) {
      tips.push({ message: 'Skördesäsong! Dags att ta in rotfrukter och skörda de sista tomaterna innan frosten.', type: 'info' });
    }
    if (tempC < 5 && month >= 10) {
      tips.push({ message: 'Täck bäddarna med löv eller halm. Plantera vitlök om du inte redan gjort det.', type: 'info' });
    }
  }

  // Winter
  if (month === 12 || month <= 2) {
    if (tempC < 0) {
      tips.push({ message: 'Viloperiod – planera nästa säsong och beställ frön!', type: 'info' });
    }
    if (month === 2 && tempC >= 2) {
      tips.push({ message: 'Snart dags att förodla! Börja med chili och paprika inomhus.', type: 'success' });
    }
  }

  if (tips.length === 0) {
    tips.push({ message: 'Kolla jordens temperatur innan du sår – den är viktigare än lufttemperaturen.', type: 'info' });
  }

  return tips;
}

// Estimated last frost dates per Swedish climate zone
const LAST_FROST_DATES: Record<number, { month: number; day: number }> = {
  1: { month: 4, day: 15 },  // Zon 1 (Malmö)
  2: { month: 4, day: 25 },  // Zon 2 (Göteborg)
  3: { month: 5, day: 5 },   // Zon 3 (Stockholm)
  4: { month: 5, day: 15 },  // Zon 4 (Falun)
  5: { month: 5, day: 25 },  // Zon 5 (Sundsvall)
  6: { month: 6, day: 1 },   // Zon 6 (Umeå)
  7: { month: 6, day: 10 },  // Zon 7 (Vilhelmina)
  8: { month: 6, day: 15 },  // Zon 8 (Kiruna)
};

export function getFrostCountdown(climateZone: number): { daysUntil: number; dateStr: string; passed: boolean } | null {
  const frostDate = LAST_FROST_DATES[climateZone];
  if (!frostDate) return null;

  const now = new Date();
  const year = now.getFullYear();
  const target = new Date(year, frostDate.month - 1, frostDate.day);

  // If frost date already passed this year
  if (now > target) {
    return { daysUntil: 0, dateStr: target.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' }), passed: true };
  }

  const diffMs = target.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    daysUntil,
    dateStr: target.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' }),
    passed: false,
  };
}

// Companion planting data
export interface CompanionInfo {
  good: string[];
  bad: string[];
}

export const COMPANION_DATA: Record<string, CompanionInfo> = {
  'Tomat': { good: ['Basilika', 'Morot', 'Persilja', 'Lök', 'Selleri'], bad: ['Fänkål', 'Kål', 'Potatis'] },
  'Gurka': { good: ['Bönor', 'Ärtor', 'Solros', 'Dill', 'Sallat'], bad: ['Potatis', 'Aromatiska örter'] },
  'Morot': { good: ['Lök', 'Purjolök', 'Tomat', 'Sallat', 'Ärtor'], bad: ['Dill', 'Fänkål'] },
  'Lök': { good: ['Morot', 'Rödbetor', 'Sallat', 'Tomat', 'Jordgubbar'], bad: ['Bönor', 'Ärtor'] },
  'Potatis': { good: ['Bönor', 'Kål', 'Majs', 'Ärtor'], bad: ['Tomat', 'Gurka', 'Squash'] },
  'Bönor': { good: ['Majs', 'Squash', 'Gurka', 'Potatis', 'Morot'], bad: ['Lök', 'Vitlök', 'Fänkål'] },
  'Ärtor': { good: ['Morot', 'Rädisor', 'Gurka', 'Majs', 'Sallat'], bad: ['Lök', 'Vitlök'] },
  'Sallat': { good: ['Morot', 'Rädisor', 'Jordgubbar', 'Lök', 'Dill'], bad: ['Selleri'] },
  'Kål': { good: ['Selleri', 'Dill', 'Lök', 'Potatis', 'Rödbetor'], bad: ['Jordgubbar', 'Tomat'] },
  'Squash': { good: ['Majs', 'Bönor', 'Solros'], bad: ['Potatis'] },
  'Rädisor': { good: ['Ärtor', 'Sallat', 'Morot', 'Spenat'], bad: ['Fänkål'] },
  'Rödbetor': { good: ['Lök', 'Kål', 'Sallat', 'Vitlök'], bad: ['Bönor'] },
  'Vitlök': { good: ['Morot', 'Tomat', 'Rödbetor', 'Jordgubbar'], bad: ['Bönor', 'Ärtor'] },
  'Majs': { good: ['Bönor', 'Squash', 'Gurka', 'Potatis'], bad: ['Tomat'] },
  'Spenat': { good: ['Jordgubbar', 'Rädisor', 'Ärtor', 'Bönor'], bad: [] },
  'Dill': { good: ['Kål', 'Sallat', 'Lök', 'Gurka'], bad: ['Morot'] },
  'Basilika': { good: ['Tomat', 'Paprika'], bad: ['Salvia'] },
  'Paprika': { good: ['Basilika', 'Tomat', 'Morot'], bad: ['Fänkål'] },
  'Jordgubbar': { good: ['Lök', 'Vitlök', 'Spenat', 'Sallat'], bad: ['Kål'] },
};
