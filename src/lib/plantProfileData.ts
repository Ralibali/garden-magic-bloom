// Rich plant profile data keyed by name_sv
// Contains descriptions, care tips, companion info, and buy links

export interface PlantProfile {
  description: string;
  careTips: string[];
  companions?: string[];
  enemies?: string[];
  funFact?: string;
  difficulty: 'lätt' | 'medel' | 'avancerad';
  harvestTip?: string;
}

const buySearchUrl = (name: string) => [
  { store: 'Plantagen', url: `https://www.plantagen.se/search?q=${encodeURIComponent(name)}` },
  { store: 'Blomsterlandet', url: `https://www.blomsterlandet.se/search?q=${encodeURIComponent(name)}` },
  { store: 'Granngården', url: `https://www.granngarden.se/search?q=${encodeURIComponent(name)}` },
];

export function getBuyLinks(plantName: string) {
  return buySearchUrl(plantName);
}

// Category-based fallback images (Unsplash)
const CATEGORY_IMAGES: Record<string, string> = {
  grönsak: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=800&q=80',
  ört: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800&q=80',
  bär: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&q=80',
  frukt: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=800&q=80',
  populär: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80',
  luftrenande: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80',
  tropisk: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80',
};

export function getPlantImage(plantName: string, subcategory?: string | null): string {
  const key = plantName.toLowerCase();
  // Specific plant images
  const SPECIFIC: Record<string, string> = {
    'tomat': 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&q=80',
    'gurka': 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=800&q=80',
    'morot': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800&q=80',
    'potatis': 'https://images.unsplash.com/photo-1518977676601-b53f82ber67a?w=800&q=80',
    'lök': 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&q=80',
    'vitlök': 'https://images.unsplash.com/photo-1615478503562-ec2d8aa2e60c?w=800&q=80',
    'basilika': 'https://images.unsplash.com/photo-1618375531912-867984bdfd72?w=800&q=80',
    'basilika (inne)': 'https://images.unsplash.com/photo-1618375531912-867984bdfd72?w=800&q=80',
    'persilja': 'https://images.unsplash.com/photo-1536161708395-1dae3eb1a1e3?w=800&q=80',
    'persilja (inne)': 'https://images.unsplash.com/photo-1536161708395-1dae3eb1a1e3?w=800&q=80',
    'jordgubbe': 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&q=80',
    'hallon': 'https://images.unsplash.com/photo-1577003811926-53b288a6e5d0?w=800&q=80',
    'blåbär': 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=800&q=80',
    'sallat': 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800&q=80',
    'spenat': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&q=80',
    'squash': 'https://images.unsplash.com/photo-1563252722-6434563a985d?w=800&q=80',
    'zucchini': 'https://images.unsplash.com/photo-1563252722-6434563a985d?w=800&q=80',
    'pumpa': 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=800&q=80',
    'paprika': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&q=80',
    'chili': 'https://images.unsplash.com/photo-1588252303782-cb80119abd6e?w=800&q=80',
    'dill': 'https://images.unsplash.com/photo-1601004890684-d8573369ee73?w=800&q=80',
    'mynta': 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=800&q=80',
    'mynta (inne)': 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=800&q=80',
    'rosmarin': 'https://images.unsplash.com/photo-1515586000433-45406d8e6662?w=800&q=80',
    'rosmarin (inne)': 'https://images.unsplash.com/photo-1515586000433-45406d8e6662?w=800&q=80',
    'timjan': 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&q=80',
    'lavendel': 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=800&q=80',
    'solros': 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=800&q=80',
    'ärta': 'https://images.unsplash.com/photo-1587049016823-69ef9d68f4fe?w=800&q=80',
    'böna': 'https://images.unsplash.com/photo-1567375698348-5d9d5ae3ee6c?w=800&q=80',
    'rädisor': 'https://images.unsplash.com/photo-1585063560830-41c84c54038e?w=800&q=80',
    'rödbetor': 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=800&q=80',
    'kål': 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=800&q=80',
    'broccoli': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80',
    'blomkål': 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80',
    'fredslilja': 'https://images.unsplash.com/photo-1593691509543-c55fb32e7355?w=800&q=80',
    'monstera': 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800&q=80',
    'svärmorstunga': 'https://images.unsplash.com/photo-1593691509543-c55fb32e7355?w=800&q=80',
    'murgröna': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80',
    'penningträd': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80',
    'olivträd (kruka)': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
  };

  for (const [k, v] of Object.entries(SPECIFIC)) {
    if (key.includes(k)) return v;
  }
  return CATEGORY_IMAGES[subcategory || ''] || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80';
}

// Rich profile data per plant
const PROFILES: Record<string, PlantProfile> = {
  // === GRÖNSAKER ===
  'Tomat': {
    description: 'Tomaten är en av de mest populära grönsakerna att odla hemma. Med rätt skötsel kan en enda planta ge flera kilo smakrika tomater under säsongen.',
    careTips: ['Vattna regelbundet vid roten, undvik att blöta bladen', 'Stöd plantan med käpp eller tomatbur', 'Ta bort tjuvar (sidoskott) regelbundet', 'Gödsla varannan vecka med tomatgödsel'],
    companions: ['Basilika', 'Morot', 'Persilja'],
    enemies: ['Potatis', 'Fänkål'],
    funFact: 'Tomaten ansågs vara giftig i Europa fram till 1800-talet!',
    difficulty: 'medel',
    harvestTip: 'Skörda när tomaterna är helt genomfärgade och lätt lossnar från stängeln.',
  },
  'Gurka': {
    description: 'Gurka trivs i värme och fuktig jord. Perfekt för växthus eller en skyddad plats i trädgården.',
    careTips: ['Vattna rikligt, gurkor består till 95% av vatten', 'Odla gärna i växthus för bäst resultat', 'Stöd med nät eller spaljé', 'Skörda ofta för att stimulera ny tillväxt'],
    companions: ['Dill', 'Sallat', 'Solros'],
    enemies: ['Tomat', 'Potatis'],
    difficulty: 'medel',
    harvestTip: 'Skörda gurkorna när de är 15-25 cm långa.',
  },
  'Morot': {
    description: 'Morötter är lättodlade och perfekta för nybörjare. De trivs bäst i lös, sandig jord utan stenar.',
    careTips: ['Så direkt utomhus, morötter gillar inte att omplanteras', 'Gallra till 3-5 cm avstånd', 'Håll jorden fuktig men inte blöt', 'Undvik färsk gödsel som ger förgrenade rötter'],
    companions: ['Lök', 'Sallat', 'Tomat'],
    enemies: ['Dill'],
    funFact: 'De första odlade morötterna var lila, inte orange!',
    difficulty: 'lätt',
    harvestTip: 'Dra upp en provmorot efter 10-12 veckor för att se om de är klara.',
  },
  'Potatis': {
    description: 'Potatis är en klassisk gröda som ger riklig skörd även på liten yta. Kan odlas i säck, låda eller direkt i marken.',
    careTips: ['Kupera regelbundet för att undvika gröna knölar', 'Vattna jämnt, särskilt under knölbildningen', 'Plantera förgrodd sättpotatis för snabbare start', 'Växla plats varje år mot potatissjukdomar'],
    companions: ['Böna', 'Kål'],
    enemies: ['Tomat', 'Gurka'],
    difficulty: 'lätt',
    harvestTip: 'Tidig potatis skördas när plantan blommar, sen potatis när blasten vissnar.',
  },
  'Sallat': {
    description: 'Sallat är snabbväxande och perfekt för successiv sådd hela säsongen. Finns i mängder av sorter från krispig isbergssallat till frodiga plocksallater.',
    careTips: ['Så var tredje vecka för kontinuerlig skörd', 'Trivs i halvskugga under varma sommardagar', 'Håll jorden jämnt fuktig', 'Skörda på morgonen för krispigast blad'],
    companions: ['Morot', 'Rädisor', 'Jordgubbe'],
    difficulty: 'lätt',
    harvestTip: 'Plocka ytterbladen och låt hjärtat växa vidare för löpande skörd.',
  },
  'Lök': {
    description: 'Lök är grundbulten i de flesta matlagning och enkel att odla. Sättlök ger snabbast resultat men frösådd ger fler sorter.',
    careTips: ['Plantera sättlök tidigt på våren', 'Rensa ogräs noga – lök konkurrerar dåligt', 'Sluta vattna när blasten börjar falla', 'Torka löken ordentligt före lagring'],
    companions: ['Morot', 'Tomat', 'Sallat'],
    enemies: ['Böna', 'Ärta'],
    difficulty: 'lätt',
  },
  'Vitlök': {
    description: 'Vitlök planteras på hösten och skördas nästa sommar. Ger en fantastisk smak som butiksvitlök inte kan matcha.',
    careTips: ['Plantera i oktober-november för bäst resultat', 'Välj en solig, väldränerad plats', 'Bryt loss enskilda klyftor och plantera 5 cm djupt', 'Ta bort blommande toppar (vitlöksboll) för större klyftor'],
    companions: ['Morot', 'Tomat', 'Jordgubbe'],
    difficulty: 'lätt',
  },
  'Squash': {
    description: 'Squash är en otroligt produktiv gröda som ger riklig skörd. En enda planta kan förse ett helt hushåll.',
    careTips: ['Ge gott om utrymme – plantan blir stor', 'Vattna vid roten, inte på bladen', 'Gödsla regelbundet med kompost', 'Skörda ofta för att stimulera ny fruktbildning'],
    companions: ['Böna', 'Majs'],
    enemies: ['Potatis'],
    funFact: 'Squash, majs och bönor kallas "de tre systrarna" och har odlats tillsammans i tusentals år.',
    difficulty: 'lätt',
    harvestTip: 'Skörda zucchini vid 15-20 cm och sommarsquash när de är unga.',
  },
  'Zucchini': {
    description: 'Zucchini är en av de mest tacksamma grönsakerna att odla – produktiv, snabbväxande och mångsidig i köket.',
    careTips: ['Vattna rikligt och jämnt', 'Skörda var 2-3:e dag under högsäsong', 'Ge plantan minst 1 m² utrymme', 'Morgonskörd ger bäst kvalitet'],
    companions: ['Böna', 'Ärta'],
    difficulty: 'lätt',
    harvestTip: 'Skörda vid 15-20 cm längd för bäst smak och konsistens.',
  },
  'Pumpa': {
    description: 'Pumpa är en rolig och dekorativ gröda som även ger gott ätbart resultat. Perfekt för barnfamiljer.',
    careTips: ['Förodla inomhus för att vinna tid', 'Ge riktigt gott om plats, rankorna blir långa', 'Lägg halm under frukterna för att undvika röta', 'Reducera till 2-3 frukter per planta för större pumpor'],
    companions: ['Majs', 'Böna'],
    difficulty: 'medel',
    harvestTip: 'Skörda när skalet blivit hårt och stängeln torkat.',
  },
  'Paprika': {
    description: 'Paprika kräver värme och lång odlingssäsong men belönar med krispiga, sötaktiga frukter.',
    careTips: ['Förodla tidigt, minst 8-10 veckor före utplantering', 'Odla gärna i växthus eller mot södervägg', 'Stöd plantan när den blir tung av frukt', 'Vattna jämnt – ojämn bevattning ger bittert resultat'],
    companions: ['Basilika', 'Tomat', 'Morot'],
    difficulty: 'avancerad',
  },
  'Chili': {
    description: 'Chili är paprikans hetare kusin och kräver liknande odlingsförhållanden. Styrkan varierar enormt mellan sorter.',
    careTips: ['Förodla mycket tidigt, redan i januari-februari', 'Kräver 20+ °C för bra groning', 'Gödsla med kaliumrik gödsel under fruktbildning', 'Torka, frys eller sylta skörden'],
    companions: ['Basilika', 'Tomat'],
    difficulty: 'avancerad',
    funFact: 'Capsaicin, ämnet som ger chili sin hetta, används även i smärtstillande krämer.',
  },
  'Ärta': {
    description: 'Ärtor är kvävefixerande och bra för jorden. Sockerärtor kan ätas direkt från plantan.',
    careTips: ['Så tidigt på våren, ärtor tål frost', 'Ge klätterhjälp med nät eller pinnar', 'Skörda ofta för fortsatt produktion', 'Lämna rötterna kvar i jorden efter säsongen'],
    companions: ['Morot', 'Gurka', 'Sallat'],
    enemies: ['Lök', 'Vitlök'],
    difficulty: 'lätt',
  },
  'Böna': {
    description: 'Bönor finns i mängder av sorter – störbönor, buskbönor, vaxbönor. Alla är lättodlade och näringsrika.',
    careTips: ['Vänta med sådd till jorden är 12+ °C', 'Störbönor behöver stöd, buskbönor klarar sig själva', 'Skörda regelbundet för ny blomning', 'Bra förfrukt som fixerar kväve i jorden'],
    companions: ['Morot', 'Squash', 'Majs'],
    enemies: ['Lök'],
    difficulty: 'lätt',
  },
  'Rädisor': {
    description: 'Rädisor är den snabbaste grönsaken att odla – klara på bara 3-4 veckor! Perfekt för otåliga odlare.',
    careTips: ['Så direkt, radavstånd 10 cm', 'Gallra tidigt för jämna rädder', 'Skörda snabbt – annars blir de träiga', 'Successiv sådd ger skörd hela säsongen'],
    companions: ['Sallat', 'Ärta', 'Morot'],
    funFact: 'Rädisor har odlats i minst 3000 år!',
    difficulty: 'lätt',
    harvestTip: 'Dra upp en provexemplar efter 3-4 veckor.',
  },
  'Rödbetor': {
    description: 'Rödbetor är härdiga, smakrika och vackra – perfekta för nybörjaren som vill ha en säker skörd.',
    careTips: ['Blötlägg fröna före sådd för snabbare groning', 'Gallra plantor som kommer i klump', 'Håll jorden jämnt fuktig', 'Bladen är också ätbara – använd dem i sallad'],
    companions: ['Lök', 'Sallat', 'Kål'],
    difficulty: 'lätt',
    harvestTip: 'Skörda vid golfbollsstorlek för bäst smak, eller låt dem växa sig större.',
  },
  'Spenat': {
    description: 'Spenat trivs i svalare väder och är perfekt för vår- och höstsådd. Snabb och lättodlad.',
    careTips: ['Så tidigt på våren eller på hösten', 'Trivs bäst i halvskugga under sommaren', 'Skörda ytterbladen löpande', 'Går fort i blom vid värme – välj resistenta sorter'],
    companions: ['Jordgubbe', 'Ärta'],
    difficulty: 'lätt',
  },
  'Kål': {
    description: 'Kål är en mångsidig gröda som finns i många former – vitkål, rödkål, grönkål, salladskål.',
    careTips: ['Förodla tidigt och plantera ut efter sista frost', 'Skydda mot kålfjäril med fiberduk', 'Vattna rikligt och jämnt', 'Gödsla med kväverik gödsel'],
    companions: ['Dill', 'Selleri', 'Lök'],
    enemies: ['Jordgubbe', 'Tomat'],
    difficulty: 'medel',
  },
  'Broccoli': {
    description: 'Broccoli ger fin skörd om man ger den rätt förutsättningar – sval temperatur och jämn vattning.',
    careTips: ['Förodla inomhus 6-8 veckor före utplantering', 'Trivs i svalare temperaturer', 'Skörda huvudet innan blommorna öppnar sig', 'Sidoskott ger bonus-skörd efter huvudskörden'],
    companions: ['Lök', 'Selleri', 'Dill'],
    difficulty: 'medel',
    harvestTip: 'Skörda medan knopparna är tätt slutna – öppnade knopar = för sent.',
  },
  'Blomkål': {
    description: 'Blomkål är lite mer krävande än broccoli men belönar med perfekta vita huvuden.',
    careTips: ['Kräver jämn vattning och temperatur', 'Vik bladen över huvudet för att behålla vit färg', 'Gödsla generöst under tillväxtperioden', 'Välj sort efter din klimatzon'],
    companions: ['Selleri', 'Dill'],
    difficulty: 'avancerad',
  },
  'Selleri': {
    description: 'Selleri finns som blekselleri och rotselleri. Båda kräver lång odlingssäsong men ger fin skörd.',
    careTips: ['Förodla tidigt, lång groningtid', 'Kräver jämnt fuktig jord', 'Blekselleri behöver kuperas', 'Gödsla regelbundet'],
    companions: ['Kål', 'Tomat', 'Böna'],
    difficulty: 'avancerad',
  },
  'Majs': {
    description: 'Sockermajs odlad hemma har en helt annan smak än butikens. Bäst att odla i block, inte rader, för pollinering.',
    careTips: ['Plantera i block, minst 4x4 plantor', 'Förodla inomhus i Mellansverige och norrut', 'Vattna rikligt under blomning', 'Gödsla med kväverikt gödsel'],
    companions: ['Böna', 'Squash', 'Pumpa'],
    funFact: 'Majs, bönor och squash kallas "de tre systrarna" – ett uråldrig odlingssystem.',
    difficulty: 'medel',
  },
  'Solros': {
    description: 'Solrosor är både dekorativa och funktionella – de lockar pollinerare och ger ätbara frön.',
    careTips: ['Så direkt efter sista frost', 'Ge stöd till höga sorter', 'Vattna regelbundet under etableringen', 'Skörda frön när baksidan av blomman blivit brun'],
    difficulty: 'lätt',
    funFact: 'Solrosor kan bli upp till 3 meter höga!',
  },
  'Purjolök': {
    description: 'Purjolök är en härdig gröda som tål frost och kan stå kvar i jorden över vintern.',
    careTips: ['Förodla tidigt på våren', 'Plantera djupt för att blanka skaften', 'Kupera under säsongen för mer vitt', 'Skörda från höst till tidig vår'],
    companions: ['Morot', 'Selleri'],
    difficulty: 'medel',
  },
  'Palsternacka': {
    description: 'Palsternacka har djup, nötig smak som blir ännu bättre efter frost. Kräver tålamod – lång groningtid.',
    careTips: ['Använd färska frön, de tappar grobarhet snabbt', 'Lös jord utan stenar ger raka rötter', 'Var tålmodig – groning tar 2-4 veckor', 'Lämna kvar i jorden tills efter frost för bäst smak'],
    difficulty: 'medel',
  },
  // === ÖRTER ===
  'Basilika': {
    description: 'Basilika är en klassisk sommärort med fantastisk doft och smak. Oumbärlig i italiensk matlagning.',
    careTips: ['Kräver värme – minst 15°C på natten', 'Knip av topparna regelbundet för busigare växt', 'Vattna på morgonen, aldrig på bladen', 'Skörda innan plantan blommar för bäst smak'],
    companions: ['Tomat', 'Paprika'],
    difficulty: 'medel',
  },
  'Basilika (inne)': {
    description: 'Basilika inomhus ger färska blad året runt. Kräver ljus och värme för att trivas.',
    careTips: ['Placera i soligt fönster, minst 6 timmar ljus', 'Vattna regelbundet men låt inte stå i vatten', 'Knip av topparna för tätare växt', 'Byt jord en gång per år'],
    difficulty: 'medel',
  },
  'Dill': {
    description: 'Dill är en av Nordens viktigaste örter – självklar till potatis, fisk och sommarbord.',
    careTips: ['Så direkt utomhus, ogillar omplanting', 'Successiv sådd var tredje vecka', 'Låt gärna gå i frö – ger självsådd nästa år', 'Frön och blad har olika smak – använd båda'],
    companions: ['Kål', 'Sallat', 'Gurka'],
    enemies: ['Morot'],
    difficulty: 'lätt',
  },
  'Persilja': {
    description: 'Persilja är en tvåårig ört som ger skörd hela säsongen. Finns som slätbladig och krusbladig.',
    careTips: ['Blötlägg frön för snabbare groning', 'Kan förodlas eller sås direkt', 'Skörda ytterstenglarna först', 'Tål frost och kan stå kvar sent på hösten'],
    companions: ['Tomat', 'Morot'],
    difficulty: 'lätt',
  },
  'Persilja (inne)': {
    description: 'Persilja inomhus ger färska blad till matlagning året om. Placera i ljust fönster.',
    careTips: ['Behöver ljust läge', 'Vattna jämnt', 'Skörda de yttre stänglarna', 'Groningen är långsam – var tålmodig'],
    difficulty: 'lätt',
  },
  'Gräslök': {
    description: 'Gräslök är en perenn krydda som kommer tillbaka år efter år med minimal skötsel.',
    careTips: ['Dela tuvan vart tredje år', 'De lila blommorna är ätbara', 'Klipp ner helt en gång per säsong', 'Trivs i sol till halvskugga'],
    companions: ['Morot', 'Tomat'],
    difficulty: 'lätt',
  },
  'Gräslök (inne)': {
    description: 'Gräslök i kruka ger färsk smak till matlagning. Enkel att ha på fönsterbrädan.',
    careTips: ['Ljust läge, gärna söder', 'Klipp med sax – dra aldrig', 'Vattna när jorden torkat något', 'Kan planteras ut på våren'],
    difficulty: 'lätt',
  },
  'Koriander': {
    description: 'Koriander delar åsikter – älskad eller hatad. Bladen och fröna har helt olika karaktär.',
    careTips: ['Så direkt – ogillar omplanting', 'Trivs i halvskugga, särskilt sommartid', 'Successiv sådd var 3:e vecka', 'Går snabbt i blom vid värme'],
    difficulty: 'medel',
  },
  'Koriander (inne)': {
    description: 'Koriander inomhus ger färska blad för asiatisk och mexikansk matlagning.',
    careTips: ['Halvskuggigt läge föredras', 'Vattna regelbundet', 'Skörda tidigt, plantan boltar snabbt', 'Så nytt regelbundet'],
    difficulty: 'medel',
  },
  'Mynta': {
    description: 'Mynta sprider sig kraftigt och odlas bäst i kruka. Finns i massor av sorter – pepparmynta, grönmynta, chokladmynta.',
    careTips: ['Odla ALLTID i kruka – sprider sig vilt', 'Kan stå i halvskugga', 'Klipp ner helt mitt i säsongen', 'Torka eller frys in för vintern'],
    companions: ['Kål', 'Tomat'],
    funFact: 'Det finns över 600 sorters mynta!',
    difficulty: 'lätt',
  },
  'Mynta (inne)': {
    description: 'Mynta i kruka inomhus ger gott te och smaksättning. Sprider härlig doft.',
    careTips: ['Halvskuggigt till ljust läge', 'Vattna ofta, mynta älskar fukt', 'Klipp tillbaka regelbundet', 'Plantera i djup kruka'],
    difficulty: 'lätt',
  },
  'Timjan': {
    description: 'Timjan är en perenn medelhavskrydda som tål torka och ger smak året runt.',
    careTips: ['Full sol och väldränerad jord', 'Vattna sparsamt – tål torka', 'Klipp tillbaka efter blomning', 'Täck vid hård vinter i norrare zoner'],
    companions: ['Kål', 'Jordgubbe'],
    difficulty: 'lätt',
  },
  'Citrontimjan': {
    description: 'Citrontimjan har en härlig citrondoft och passar perfekt till fisk och kyckling.',
    careTips: ['Full sol, torr jord', 'Tål torka väl', 'Klipp efter blomning för tätare växt', 'Kan odlas i kruka året runt'],
    difficulty: 'lätt',
  },
  'Oregano': {
    description: 'Oregano är en perenn medelhavskrydda som trivs i sol och torr jord.',
    careTips: ['Full sol, mager jord ger bäst smak', 'Klipp ner före blomning för starkast arom', 'Dela plantan vart tredje år', 'Torkar utmärkt för vinterbruk'],
    difficulty: 'lätt',
  },
  'Oregano (inne)': {
    description: 'Oregano i kruka fungerar bra inomhus med tillräckligt ljus.',
    careTips: ['Soligt fönster', 'Låt torka mellan vattningarna', 'Klipp regelbundet', 'Byt kruka årligen'],
    difficulty: 'lätt',
  },
  'Rosmarin': {
    description: 'Rosmarin är en aromatisk medelhavskrydda med barrliknande blad och vacker blomning.',
    careTips: ['Kräver full sol och väldränerad jord', 'Vattna sparsamt – övervattning dödar', 'Ta in under vintern i kallare zoner', 'Klipp regelbundet för busigare växt'],
    difficulty: 'medel',
  },
  'Rosmarin (inne)': {
    description: 'Rosmarin i kruka inomhus ger färsk krydda men kräver mycket ljus.',
    careTips: ['Soligaste fönstret du har', 'Vattna sparsamt, låt torka mellan', 'God luftcirkulation förebygger mögel', 'Spraya bladen med vatten ibland'],
    difficulty: 'medel',
  },
  'Lavendel': {
    description: 'Lavendel doftar himmelskt och lockar bin och fjärilar. Perfekt i krukor eller rabatter.',
    careTips: ['Full sol, mager och väldränerad jord', 'Klipp efter blomning – aldrig i gammal ved', 'Tål inte stående fukt', 'Fungerar bra som kantväxt'],
    funFact: 'Lavendel har använts för sina lugnande egenskaper i tusentals år.',
    difficulty: 'lätt',
  },
  'Citronmeliss': {
    description: 'Citronmeliss sprider citrusdoft och är perfekt för te och desserter.',
    careTips: ['Trivs i halvskugga till sol', 'Kan sprida sig – odla gärna i kruka', 'Klipp ner före blomning', 'Torka bladen för teer'],
    difficulty: 'lätt',
  },
  'Salvia': {
    description: 'Salvia är en perenn ört med gråaktiga, aromatiska blad. Klassisk till kött och pasta.',
    careTips: ['Full sol, väldränerad jord', 'Klipp tillbaka på våren', 'Vattna sparsamt', 'Ersätt plantan vart 3-4:e år'],
    difficulty: 'lätt',
  },
  // === BÄR ===
  'Jordgubbe': {
    description: 'Jordgubbar är sommarens älskling. Odla själv för den absolut godaste smaken.',
    careTips: ['Plantera i sol, gärna upphöjd bädd', 'Täck med halm mot jordstänk och ogräs', 'Ta bort utlöpare för större bär', 'Förnya plantorna vart 3:e år'],
    companions: ['Sallat', 'Spenat', 'Lök'],
    enemies: ['Kål'],
    funFact: 'Jordgubben är den enda frukten med frön på utsidan.',
    difficulty: 'lätt',
    harvestTip: 'Plocka när bären är helt genomfärgade, helst på morgonen.',
  },
  'Hallon': {
    description: 'Hallon ger riklig skörd och kommer tillbaka år efter år. Finns som sommar- och höstsorter.',
    careTips: ['Plantera i sol med vindskydd', 'Sommarhallon bär på fjolårsved – beskär efter skörd', 'Hösthallon klipps ner helt på våren', 'Stöd med vajer eller spaljé'],
    difficulty: 'lätt',
    harvestTip: 'Skörda när bären lätt lossnar från tapppen.',
  },
  'Blåbär': {
    description: 'Odlade blåbär behöver sur jord (pH 4-5) men belönar med stora, smakrika bär.',
    careTips: ['Kräver sur jord – blanda med rhododendronjord', 'Vattna med regnvatten (kalkfritt)', 'Beskär bort gammal ved för att förnya', 'Skydda mot fåglar med nät'],
    difficulty: 'medel',
  },
  'Vinbär': {
    description: 'Vinbär – röda, svarta och vita – är lättskötta buskar som ger bär till sylt, saft och bakning.',
    careTips: ['Trivs i sol till halvskugga', 'Beskär varje år, ta bort grenar äldre än 3 år', 'Gödsla med kompost på våren', 'Svarta vinbär har mest C-vitamin'],
    difficulty: 'lätt',
  },
  'Krusbär': {
    description: 'Krusbär är en gammaldags trädgårdsfavorit som är värd att återupptäcka.',
    careTips: ['Trivs i halvskugga till sol', 'Glesa ur busken för god luftcirkulation', 'Mjöldagg kan vara ett problem – välj resistenta sorter', 'Skörda halvmogna för matlagning, mogna för ätning'],
    difficulty: 'lätt',
  },
  // === FRUKT ===
  'Äpple': {
    description: 'Äppelträd finns i alla storlekar – från pelarkrön till fullstora träd. Välj sort efter klimatzon.',
    careTips: ['Plantera med pollinationspartner', 'Formklipp unga träd de första åren', 'Gödsla med kompost på våren', 'Gallra frukter i juni för större äpplen'],
    difficulty: 'medel',
  },
  // === KRUKVÄXTER ===
  'Monstera': {
    description: 'Monstera deliciosa, eller "schweizisk ostväxt", är en ikonisk tropisk växt med dramatiska, flikiga blad.',
    careTips: ['Ljust läge men undvik direkt sol', 'Vattna när övre 3 cm torkat', 'Torka av bladen regelbundet', 'Ge klätterhjälp med mosspinne'],
    funFact: 'I naturen kan Monstera bli 20 meter hög!',
    difficulty: 'lätt',
  },
  'Fredslilja': {
    description: 'Fredsliljan är en av de bästa luftrenande krukväxterna. Trivs i skugga och blommar med vita kolvar.',
    careTips: ['Tolererar skuggiga platser', 'Hänger bladen vid törst – lättläst signal', 'Spraya bladen ibland för fuktighet', 'Giftig för husdjur – placera högt'],
    difficulty: 'lätt',
  },
  'Svärmorstunga': {
    description: 'Svärmorstunga (Sansevieria) är närmast oförstörbar. Perfekt för nybörjare och glömska.',
    careTips: ['Tål allt från skugga till sol', 'Vattna mycket sparsamt, var 2-3:e vecka', 'Övervattning är vanligaste dödsorsaken', 'Trivs i trång kruka'],
    funFact: 'Svärmorstunga producerar syre även nattetid!',
    difficulty: 'lätt',
  },
  'Penningträd': {
    description: 'Penningträdet (Crassula ovata) är en sukkulent med tjocka, glänsande blad. Sägs bringa lycka.',
    careTips: ['Soligt till ljust läge', 'Låt torka mellan vattningar', 'Kan bli mycket gammal med rätt skötsel', 'Beskär för tätare växt'],
    difficulty: 'lätt',
  },
  'Murgröna': {
    description: 'Murgröna är en klassisk klätterväxt som även fungerar utmärkt som hängväxt inomhus.',
    careTips: ['Trivs i halvskugga', 'Håll jämnt fuktig jord', 'Klipp tillbaka för tätare växt', 'Bra luftrenare'],
    difficulty: 'lätt',
  },
  'Båghampa': {
    description: 'Båghampa (Sansevieria cylindrica) är en skulptural och lättskött krukväxt med cylindriska blad.',
    careTips: ['Ljust till halvskuggigt läge', 'Vattna sparsamt, var 10:e dag räcker', 'Tål torr luft väl', 'Undvik att vattna i bladrosetten'],
    difficulty: 'lätt',
  },
  'Elefantöra': {
    description: 'Elefantöra (Alocasia) har dramatiska, stora blad med vacker ådring. En riktig statement-växt.',
    careTips: ['Ljust, indirekt ljus', 'Hög luftfuktighet föredras', 'Vattna regelbundet, undvik uttorkning', 'Kan tappa blad vintertid – normalt'],
    difficulty: 'medel',
  },
  'Bostonormbunke': {
    description: 'Bostonormbunken är en klassisk inomhusväxt med gracila, överhängande blad. Utmärkt luftrenare.',
    careTips: ['Halvskugga till skugga', 'Hög fuktighet – spraya regelbundet', 'Vattna ofta, jordn ska aldrig torka ut', 'Undvik drag och direkt sol'],
    difficulty: 'medel',
  },
  'Citronträd': {
    description: 'Citronträd i kruka ger blommor med himmelsk doft och med lite tur – egna citroner.',
    careTips: ['Soligaste platsen, gärna utomhus på sommaren', 'Citrusgödsel under växtsäsongen', 'Svalt (10-15°C) och ljust under vintern', 'Spraya bladen vid torr inomhusluft'],
    difficulty: 'avancerad',
  },
  'Olivträd (kruka)': {
    description: 'Olivträd i kruka ger medelhavskänsla till balkongen. Härdig och vacker med silvergröna blad.',
    careTips: ['Full sol, gärna södervänd balkong', 'Vattna sparsamt – tål torka', 'Ta in vid frost (under 0°C)', 'Tål att beskäras för form'],
    difficulty: 'medel',
  },
  'Kinesisk bambulycka': {
    description: 'Lucky bamboo är inte bambu utan en dracena. Populär feng shui-växt som kan odlas i vatten.',
    careTips: ['Indirekt ljus, aldrig direkt sol', 'Byt vatten varje vecka om du odlar i vatten', 'Använd filtrerat eller avklorerat vatten', 'Kan odlas i jord eller bara vatten'],
    difficulty: 'lätt',
  },
  'Zebragräs': {
    description: 'Zebragräs (Calathea zebrina) har slående randiga blad som rör sig under dygnet.',
    careTips: ['Indirekt ljus, ingen direkt sol', 'Hög fuktighet – spraya dagligen', 'Vattna med ljummet, kalkfritt vatten', 'Bladen stänger sig på natten – det är normalt'],
    funFact: 'Calathea kallas "bönväxt" för att bladen viker ihop sig på natten, som händer i bön.',
    difficulty: 'avancerad',
  },
};

export function getPlantProfile(nameSv: string): PlantProfile {
  return PROFILES[nameSv] || {
    description: `${nameSv} är en populär växt att odla. Utforska skötselråden nedan för bästa resultat.`,
    careTips: ['Ge rätt mängd vatten', 'Placera i lämpligt ljus', 'Gödsla under växtsäsongen'],
    difficulty: 'medel' as const,
  };
}
