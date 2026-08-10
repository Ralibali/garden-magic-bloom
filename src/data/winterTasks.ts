/**
 * Sysslor som inte handlar om sådd, utplantering eller skörd.
 * sowingMatrix täcker bara vår till höst (LAST_FROST → SEASON_END),
 * medan odlingskalendern behöver innehåll även för november–februari.
 *
 * `zoneShift` beskriver hur många veckor senare sysslan blir i kalla zoner:
 * månaden justeras för zon sju och åtta när sysslan är väderberoende.
 */

export type SeasonTask = {
  title: string;
  description: string;
  /** Månader (1–12) där sysslan hör hemma i zon 1–3. */
  months: number[];
  /** Sysslan skjuts en månad framåt i kalla zoner (zon 6–8). */
  laterInColdZones?: boolean;
  /** Sysslan är inte relevant i dessa zoner. */
  skipZones?: number[];
};

export const winterTasks: SeasonTask[] = [
  {
    title: 'Inventera fröerna',
    description: 'Gå igenom fröpåsarna, sortera bort sådant som passerat bäst-före och skriv en inköpslista innan sorterna tar slut hos leverantörerna.',
    months: [1, 12],
  },
  {
    title: 'Planera växtföljden',
    description: 'Rita upp bäddarna och flytta kål, lök, rotfrukter och baljväxter ett steg. Fyra års rotation håller jordtrötthet och klumprotsjuka borta.',
    months: [1, 2],
  },
  {
    title: 'Groddar och skott på fönsterbrädan',
    description: 'Alfalfa, ärtskott och solrosskott ger färsk grönska på fem till tio dagar mitt i vintern. Skölj morgon och kväll.',
    months: [1, 2, 11, 12],
  },
  {
    title: 'Kontrollera lager av potatis, lök och rotfrukter',
    description: 'Rensa bort det som börjat mögla eller gro. En dålig knöl förstör hela lådan.',
    months: [1, 2, 11, 12],
  },
  {
    title: 'Förodla chili och paprika',
    description: 'Chili och paprika behöver längst kultur av allt du odlar. Så under växtbelysning nu, annars hinner frukterna inte mogna.',
    months: [2],
    laterInColdZones: true,
  },
  {
    title: 'Beskär fruktträd',
    description: 'Beskär äpple och päron under vinterns senare del när trädet är i vila och det är frostfritt. Plommon och körsbär beskärs i stället på sommaren.',
    months: [2, 3],
    laterInColdZones: true,
  },
  {
    title: 'Se över växthuset',
    description: 'Tvätta glas och plast, laga hål och skrubba bort alger. Rent glas ger märkbart mer ljus till de tidiga sådderna.',
    months: [2, 3],
  },
  {
    title: 'Testa gronigheten på gamla frön',
    description: 'Lägg tio frön på fuktigt hushållspapper. Gror färre än hälften – köp nytt.',
    months: [2, 3],
  },
  {
    title: 'Kallsådd av härdiga arter',
    description: 'Ringblomma, dill, spenat, morot och vallmo kan sås direkt i kall jord. Fröna gror när jorden själv bestämmer att det är dags.',
    months: [3, 4],
    laterInColdZones: true,
  },
  {
    title: 'Fyll på med kompost och gödsel',
    description: 'Lägg några centimeter kompost eller välbrunnen gödsel ovanpå bäddarna. Maskarna gör resten av jobbet.',
    months: [4, 10],
  },
  {
    title: 'Sätt upp stöd och nät',
    description: 'Sätt ärtnät, tomatstöd och insektsnät innan plantorna behöver dem – det är alltid krångligare efteråt.',
    months: [5],
    laterInColdZones: true,
  },
  {
    title: 'Vattna på djupet, inte ofta',
    description: 'Ge rikligt med vatten någon gång i veckan i stället för lite varje dag. Rötterna söker sig nedåt och plantan blir torktåligare.',
    months: [6, 7],
  },
  {
    title: 'Så höstsallat och höstspenat',
    description: 'Sensommarsådd ger skörd långt in på hösten, och plantorna slipper vårens sniglar.',
    months: [7, 8],
  },
  {
    title: 'Ta frön från årets bästa plantor',
    description: 'Spara frön från de plantor som gav mest i just din jord. Torka helt innan du packar i papperspåse.',
    months: [8, 9],
  },
  {
    title: 'Plantera vitlök',
    description: 'Sätt vitlöksklyftorna innan jorden fryser, ungefär fem centimeter djupt. De ska hinna rota sig men inte skjuta höga skott.',
    months: [9, 10],
  },
  {
    title: 'Täck jorden inför vintern',
    description: 'Löv, halm eller gräsklipp skyddar mot regnerosion och håller näringen kvar. Bar jord förlorar struktur under vintern.',
    months: [10, 11],
  },
  {
    title: 'Ta in krukor och töm vattenslangar',
    description: 'Frostkänsliga krukor spricker och kranar går sönder. Töm, torka och ställ undan innan första riktiga kylan.',
    months: [10, 11],
    laterInColdZones: false,
  },
  {
    title: 'Rengör och olja redskapen',
    description: 'Skrubba jord från spadar och sekatörer, slipa eggen och torka av med lite olja. Verktygen håller dubbelt så länge.',
    months: [11, 12],
  },
  {
    title: 'Utvärdera säsongen i dagboken',
    description: 'Skriv ner vad som gav mest, vad som misslyckades och vad du vill testa nästa år. Det är den anteckningen du kommer läsa flest gånger.',
    months: [11, 12],
  },
];

/** Sysslor för en given månad och zon. */
export function getWinterTasks(month: number, zone: number): SeasonTask[] {
  return winterTasks.filter(task => {
    if (task.skipZones?.includes(zone)) return false;
    const shifted = task.laterInColdZones && zone >= 6
      ? task.months.map(m => (m % 12) + 1)
      : task.months;
    return shifted.includes(month);
  });
}
