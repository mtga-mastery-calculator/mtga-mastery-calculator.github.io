import React, { useState, useEffect } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import { Set, sets, Rewards } from './sets';
import './styles/App.css';

const mythinUpgadeForSet: { [key: string]: number } = {
  'FIN': 1/8.4,
  'OM1': 15/121, // ~1/8.1,
  'LCI': 11/75, //  ~1/6.8,
};
const bonusUpgradeForSet: { [key: string]: number } = {
  'TLA': 1/25,
  'OM1': 1/64,
  'FIN': 1/3,
  'TDM': 1/60,
  'DFT': 1/64,
  'MKM': 1/8,
  'OTJ': 1,
  'EOE': 1/55,
  'ECL': 1/55,
};
function packsToWildcards(packs: number, isMythic: boolean, isGoldenPack: boolean, withVault: boolean, set: string) {
  const mythicUpgrade = mythinUpgadeForSet[set] ?? 1/7;
  const mythicCardUpgrade = isMythic ? 1 : mythicUpgrade;
  const goldenMythicUpgrade = 1/6; // "approximately"
  const bonusUpgrade = bonusUpgradeForSet[set] ?? 0;
  const commonWCInPack = 1/3;
  const uncommonWCInPack = 1/5;
  const rareWCInPack = 1/30; // * (1 - mythicUpgrade);
  const mythicWCInPack = 1/30; // * mythicUpgrade;

  const rareInGoldenPack = isGoldenPack ? 5 * (1 - goldenMythicUpgrade) / 10 : 0;
  const mythicInGoldenPack = isGoldenPack ? (1 + 5 * goldenMythicUpgrade) / 10 : 0;

  const uncommonWheel = 1/6 * (isGoldenPack ? 1.1 : 1);
  const rareWheel = 1/6 * (1 - 1/5) * (isGoldenPack ? 1.1 : 1);
  const mythicWheel = 1/6 * 1/5 * (isGoldenPack ? 1.1 : 1);

  const commonsInPack = 5 - commonWCInPack - bonusUpgrade;
  const uncommonsInPack = 2 - uncommonWCInPack;
  const raresInPack = (1 - rareWCInPack - mythicWCInPack) * (1 - mythicCardUpgrade);
  const mythicsInPack = (1 - rareWCInPack - mythicWCInPack) * mythicCardUpgrade;
  const bonusInPack = bonusUpgrade;

  const vaultProgress = withVault ? commonsInPack * 0.1 + uncommonsInPack * 0.3 : 0;
  const vaultUncommonWC = vaultProgress / 100 * 3;
  const vaultRareWC = vaultProgress / 100 * 2;
  const vaultMythicWC = vaultProgress / 100 * 1;
  return {
    u: packs * (uncommonWCInPack + uncommonWheel + vaultUncommonWC),
    r: packs * (rareWCInPack + rareWheel + vaultRareWC),
    m: packs * (mythicWCInPack + mythicWheel + vaultMythicWC),
    c: packs * (commonWCInPack),
    totalCommons: packs * commonsInPack,
    totalUncommons: packs * uncommonsInPack,
    totalRares: packs * (raresInPack + rareInGoldenPack),
    totalMythics: packs * (mythicsInPack + mythicInGoldenPack),
    totalBonus: packs * bonusInPack,
    fromWheel: {
      u: packs * uncommonWheel,
      r: packs * rareWheel,
      m: packs * mythicWheel,
    },
    fromVault: {
      u: packs * vaultUncommonWC,
      r: packs * vaultRareWC,
      m: packs * vaultMythicWC,
    },
    fromPacks: {
      u: packs * uncommonWCInPack,
      r: packs * rareWCInPack,
      m: packs * mythicWCInPack,
      c: packs * commonWCInPack,
    },
    vaultProgress: packs * vaultProgress,
  }
}
/**
 * Calculates the probability of getting at least x successes in y draws.
 * @param {number} x - Minimum required successes (at least x As).
 * @param {number} y - Total number of draws.
 * @param {number} a - Total number of successes in population (As).
 * @param {number} N - Total population size.
 * @returns {number} The probability (0 to 1).
 */
function probabilityAtLeastX(x: number, y: number, a: number, N: number): number {
  let totalProbability = 0;
  // Sum probabilities for k successes from x up to the maximum possible
  // Max successes is limited by either total draws (y) or total available As (a)
  const maxSuccesses = Math.min(y, a);
  for (let k = x; k <= maxSuccesses; k++) {
    totalProbability += hypergeometricPMF(k, N, a, y);
  }
  return totalProbability;
}
/**
 * Calculates the probability distribution for getting k successes in y draws.
 * @param {number} y - Total number of draws.
 * @param {number} a - Total number of successes in population (As).
 * @param {number} N - Total population size.
 * @returns {number[]} Array of probabilities where index k represents P(X = k).
 */
function probabilityDistribution(y: number, a: number, N: number): number[] {
  return [...Array(Math.min(y, a) + 1)].map((_, k) => hypergeometricPMF(k, N, a, y));
}
function probabilityDistributionWithSmoothing(y: number, a: number, N: number): number[] {
  const avg = y * a / N;
  const cntToWeight = (k: number) => 1 / Math.pow(4, Math.pow(Math.abs(k - avg), 2.5));
  const handWeights = probabilityDistribution(y, a, N);
  const weights = [...Array(y + 1)].map((_, k) => cntToWeight(k));
  const probabilities = [...Array(y + 1)].fill(0);
  for (let h1 = 0; h1 <= y; h1++) {
    for (let h2 = 0; h2 <= y; h2++) {
      for (let h3 = 0; h3 <= y; h3++) {
        const p = handWeights[h1] * handWeights[h2] * handWeights[h3] || 0;
        const h1w = weights[h1], h2w = weights[h2], h3w = weights[h3];
        const t = h1w + h2w + h3w;
        probabilities[h1] += p * h1w / t;
        probabilities[h2] += p * h2w / t;
        probabilities[h3] += p * h3w / t;
      }
    }
  }
  return probabilities;
}
function probabilityDistributionWithSmoothing7(y: number, a: number, N: number): number[] {
  const first7distribution = probabilityDistributionWithSmoothing(Math.min(7, y), a, N);
  const restDistribution = probabilityDistribution(y - Math.min(7, y), a, N);
  const probabilities = [...Array(y + 1)].fill(0);
  for (let first7 = 0; first7 <= Math.min(7, y); first7++) {
    for (let rest = 0; rest <= y - Math.min(7, y); rest++) {
      probabilities[first7 + rest] += first7distribution[first7] * restDistribution[rest];
    }
  }
  return probabilities;
}

/**
 * Probability Mass Function (PMF) for exactly k successes.
 * Formula: P(k) = [aCk * bC(y-k)] / NCy
 */
function hypergeometricPMF(k: number, N: number, a: number, y: number): number {
  if (k < 0 || k > a || (y - k) > (N - a) || (y - k) < 0) return 0;
  return (combinations(a, k) * combinations(N - a, y - k)) / combinations(N, y);
}
function combinations(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  if (r > n / 2) r = n - r; // Symmetry optimization
  let res = 1;
  for (let i = 1; i <= r; i++) {
    res = res * (n - i + 1) / i;
  }
  return res;
}

function presentSet(now: Date): Set {
  return sets.filter(set => set.startDate <= now).reduce((latest, set) => set.startDate > latest.startDate ? set : latest);
}

function xpToLevel(xp: number): number {
  return Math.floor(xp / 1000) + 1;
}

function getDifferenceInTime(startDate: Date, endDate: Date): { days: number, hours: number, minutes: number } {
  const diff = endDate.getTime() - startDate.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
}

function getDatesBetween(set: Set, intervalHours: number): Date[] {
  const dates = [];
  let currentDate = new Date(set.startDate);

  for(;;) {
    dates.push(new Date(currentDate));
    if (currentDate > set.endDate) break;
    currentDate.setHours(currentDate.getHours() + intervalHours);
  }
  return dates;
}

function getTimeLeft(dateInput: Date, set: Set) {
  const isInitial = dateInput <= set.startDate ? 1 : 0;
  const date = new Date(dateInput);
  let daysLeft = 0;
  let sundaysLeft = 0;
  const targetHour = 9; // 9am UTC is the daily reset
  if (date.getUTCHours() >= targetHour) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  date.setUTCHours(targetHour);

  while (date < set.endDate) {
    daysLeft++;
    if (date.getUTCDay() === 0) sundaysLeft++;
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return {
    daysLeft: daysLeft + isInitial,
    sundaysLeft: sundaysLeft + isInitial,
    questsLeft: daysLeft + isInitial * 3,
  };
}
function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit' };
  return date.toLocaleDateString('en-US', options);
}


function getXPForDate(date: Date, set: Set, winsPerDay: number = 10, winsPerWeek: number = 15, questWins?: number): number {
  const xpPerDay = Math.min(winsPerDay, 10) * 25;
  const xpPerWeek = Math.min(winsPerWeek, 15) * 250;
  const xpPerQuest = 500;
  const {daysLeft, sundaysLeft, questsLeft} = getTimeLeft(date, set);
  return xpPerDay * daysLeft + xpPerWeek * sundaysLeft + xpPerQuest * (questWins !== undefined ? Math.min(questsLeft, questWins): questsLeft);
}

function getGoldPerWeek(winsPerDay: number, questPercent: number): { min: number; max: number; avg: number } {
  const goldRewards = [250, 100, 100, 100, 0, 50, 0, 50, 0, 50, 0, 25, 0, 25, 0];
  const goldCummulative = goldRewards.slice(0, winsPerDay).reduce((a, b) => a + b, 0);
  const questGold = (500 * 9 + 750 * 7) / 16;
  const questGoldMin = 500, questGoldMax = 750;
  return {
    min: Math.floor(7 * (goldCummulative + questGoldMin * questPercent)),
    max: Math.floor(7 * (goldCummulative + questGoldMax * questPercent)),
    avg: Math.floor(7 * (goldCummulative + questGold * questPercent)),
  }
}

interface SliderInputProps {
    value: number;
    onChange: (value: number) => void;
    label: string;
    min: number;
    max: number;
    step?: number;
}

const SliderInput: React.FC<SliderInputProps> = ({ value, onChange, label, min, max, step }) => {
    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(event.target.value));
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(event.target.value));
    };

    return (
        <div style={{ margin: '10px', color: 'white', display: 'flex' }}>
            <label>{label}</label>
            <input
                type="number"
                value={value}
                onChange={handleInputChange}
                min={min}
                max={max}
                step={step}
                style={{ margin: '0 10px', width: '60px' }}
            />
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleSliderChange}
                style={{ width: '200px' }}
            />
        </div>
    );
};

const FormattedXP = ({ xp }: { xp: number }) => {
  const formattedXP = xp.toString().padStart(4, '0');

  return (
    <span>
      {formattedXP.slice(0, -3)}
      <span style={{ fontSize: '0.8em', color: '#aaa' }}>{formattedXP.slice(-3)}</span>
    </span>
  );
};

const sortKeys: [ RegExp | String, number ][] = [
  [ 'Gems', 0 ],
  [ 'Gold', 1 ],
  [ 'Booster', 2 ],
  [ /Draft Token/, 3 ],
  [ /\bICR\b/, 4 ],
  [ /\bCard$/, 4 ],
  [ 'Orb', 5 ],
  [ /\bCS\b/, 9 ],
  [ 'Card Style', 9 ],
  [ /\bPet\b|\bCompanion\b/, 6 ],
  [ /\bAvatar\b/, 7 ],
  [ /\bSleeve\b/, 8 ],
  [ /\bEmote\b/, 10 ],
]
const getSortKey = (item: string) => {
  for (const [key, value] of sortKeys) {
    if (key instanceof RegExp ? key.test(item) : item === key) return value;
  }
  return 99;
};

interface RewardItemProps {
  item: string;
  count: number;
  subitems?: Map<string, number>;
}
const RewardItem: React.FC<RewardItemProps> = ({ item, count, subitems }) => (
  <li key={item} className={'reward_' + getSortKey(item)}>{count} {item}
    {subitems && <span style={{fontSize:'75%'}}> (
      {Array.from(subitems.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subitem, count]) => (
          count > 1 ? <span>{count}x {subitem}</span> : <span>{subitem}</span>
        ))
        .reduce((prev, curr) => <>{prev}, {curr}</>)}
    )</span>
    }
  </li>
);

const aggregateRewards = (rewards: Rewards, startLevel: number, endLevel: number) => {
  const aggregated = new Map<string, number>();
  const subitems = new Map<string, [string, number][]>();
  const aggregatedSubitems = new Map<string, Map<string, number>>();

  for (let level = startLevel; level <= endLevel; level++) {
    const idx = Math.min(level - 1, rewards.length - 1);
    rewards[idx].forEach(([count, item, subitem]: [number, string, string]) => {
        aggregated.set(item, (aggregated.get(item) ?? 0) + count);
        if (subitem) {
          const list = subitems.get(item) ?? [];
          list.push([subitem, count]);
          subitems.set(item, list);
        }
    });
  }
  subitems.forEach((list, item) => {
    const subitemCounts = new Map<string, number>();
    list.forEach(([subitem, count]) => {
    subitemCounts.set(subitem, (subitemCounts.get(subitem) ?? 0) + count);
    });
    aggregatedSubitems.set(item, subitemCounts);
  });

  return Array.from(aggregated.entries())
    .map(([item, count]) => ({ item, count, subitems: aggregatedSubitems.get(item) }))
    .sort((a, b) => getSortKey(a.item) - getSortKey(b.item));
};

const FormattedCount = ({ count }: { count: number }) => {
  const formattedCount = count.toFixed(2);
  return (
    <span className="formatted-count">
      {formattedCount.slice(0, -3)}
      <span style={{ fontSize: '0.8em', color: '#aaa' }}>{formattedCount.slice(-3)}</span>
    </span>
  );
};

const PacksCalculator: React.FC<{ set: Set }> = ({ set }) => {
  const [numPacks, setNumPacks] = useState(100);
  const [isMythic, setIsMythic] = useState(false);
  const [isGoldenPack, setIsGoldenPack] = useState(false);
  const [withVault, setWithVault] = useState(true);

  const results = packsToWildcards(numPacks, isMythic, isGoldenPack, withVault, set.code);

  return (
    <div className="packs-calculator">
      <div className="info">
        <h3>For set: {set.name}</h3>
      </div>
      <div className="container" style={{ alignItems: 'flex-start', padding: '10px' }}>
        <SliderInput
          label="Number of Packs"
          value={numPacks}
          onChange={setNumPacks}
          min={1}
          max={500}
        />
        <label style={{ margin: '10px', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isMythic}
            onChange={(e) => setIsMythic(e.target.checked)}
            style={{ marginRight: '10px', width: '20px', height: '20px' }}
          />
          Mythic packs
        </label>
        <label style={{ margin: '10px', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isGoldenPack}
            onChange={(e) => setIsGoldenPack(e.target.checked)}
            style={{ marginRight: '10px', width: '20px', height: '20px' }}
          />
          Include Golden Packs
        </label>
        <label style={{ margin: '10px', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={withVault}
            onChange={(e) => setWithVault(e.target.checked)}
            style={{ marginRight: '10px', width: '20px', height: '20px' }}
          />
          Include Vault progress (assume C/UC completion)
        </label>
      </div>
      <div className="rewards">
        <div>
          <h2>Wildcards Expected</h2>
          <ul>
            <li style={{ fontSize: '120%' }}><FormattedCount count={results.m} /> Mythic WC</li>
            <li style={{ fontSize: '120%' }}><FormattedCount count={results.r} /> Rare WC</li>
            <li style={{ fontSize: '120%' }}><FormattedCount count={results.u} /> Uncommon WC</li>
            <li style={{ fontSize: '120%' }}><FormattedCount count={results.c} /> Common WC</li>
          </ul>
          <h3>From Packs</h3>
          <ul style={{ fontSize: '90%', color: '#aaa' }}>
            <li><FormattedCount count={results.fromPacks.m} /> Mythic WC</li>
            <li><FormattedCount count={results.fromPacks.r} /> Rare WC</li>
            <li><FormattedCount count={results.fromPacks.u} /> Uncommon WC</li>
            <li><FormattedCount count={results.fromPacks.c} /> Common WC</li>
          </ul>
          <h3>From Wildcard Track</h3>
          <ul style={{ fontSize: '90%', color: '#aaa' }}>
            <li><FormattedCount count={results.fromWheel.m} /> Mythic WC</li>
            <li><FormattedCount count={results.fromWheel.r} /> Rare WC</li>
            <li><FormattedCount count={results.fromWheel.u} /> Uncommon WC</li>
          </ul>
          {withVault && (
            <>
              <h3>From Vault ({results.vaultProgress.toFixed(1)}%)</h3>
              <ul style={{ fontSize: '90%', color: '#aaa' }}>
                <li><FormattedCount count={results.fromVault.m} /> Mythic WC</li>
                <li><FormattedCount count={results.fromVault.r} /> Rare WC</li>
                <li><FormattedCount count={results.fromVault.u} /> Uncommon WC</li>
              </ul>
            </>
          )}
        </div>
        <div>
          <h2>Cards Expected</h2>
          <ul>
            <li style={{ fontSize: '120%' }}><FormattedCount count={results.totalMythics} /> Mythic</li>
            <li style={{ fontSize: '120%' }}><FormattedCount count={results.totalRares} /> Rare</li>
            <li style={{ fontSize: '120%' }}><FormattedCount count={results.totalUncommons} /> Uncommon</li>
            <li style={{ fontSize: '120%' }}><FormattedCount count={results.totalCommons} /> Common</li>
            {results.totalBonus > 0 && (
              <li style={{ fontSize: '110%' }}><FormattedCount count={results.totalBonus} /> Bonus sheet</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

const LandDrawCalculator: React.FC = () => {
  const [deckSize, setDeckSize] = useState(60);
  const [landCount, setLandCount] = useState(24);
  const [drawCount, setDrawCount] = useState(7);
  const [targetMin, setTargetMin] = useState(2);
  const [targetMax, setTargetMax] = useState(4);
  const [handSmoothing, setHandSmoothing] = useState(false);

  const distribution = handSmoothing
    ? probabilityDistributionWithSmoothing7(drawCount, landCount, deckSize)
    : probabilityDistribution(drawCount, landCount, deckSize);

  // Calculate probability for target range
  const targetProbability = distribution
    .slice(Math.max(0, targetMin), Math.min(distribution.length, targetMax + 1))
    .reduce((sum, p) => sum + p, 0);

  // Generate gradient colors based on target range
  const generateColor = (k: number, total: number) => {
    const isInTarget = k >= targetMin && k <= targetMax;
    const baseColor = isInTarget ? [0, 255, 0] : [255, 0, 0]; // Green or Red

    // Calculate brightness from 20% to 80%
    const brightness = 0.2 + (k / Math.max(1, total - 1)) * 0.6;
    const [r, g, b] = baseColor.map(c => Math.floor(c * brightness));

    return `rgba(${r}, ${g}, ${b}, 1)`;
  };

  const chartData = {
    labels: distribution.map((_, k) => `${k} lands`),
    datasets: [
      {
        label: 'Probability',
        data: distribution,
        backgroundColor: distribution.map((_, k) => generateColor(k, distribution.length)),
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'white',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = (value * 100).toFixed(2);
            return `${label}: ${percentage}%`;
          },
        },
      },
    },
  };

  return (
    <div className="land-draw-calculator">
      <div className="info">
        <h3>Calculate probability of drawing lands</h3>
      </div>
      <div className="container" style={{ alignItems: 'flex-start', padding: '10px' }}>
        <SliderInput
          label="Deck Size"
          value={deckSize}
          onChange={(x) => {setDeckSize(x); setLandCount(Math.min(landCount, x)); setDrawCount(Math.min(drawCount, x)); setTargetMax(Math.min(targetMax, x)); setTargetMin(Math.min(targetMin, x)); }}
          min={1}
          max={99}
        />
        <SliderInput
          label="Land Count"
          value={landCount}
          onChange={(v) => setLandCount(Math.min(v, deckSize))}
          min={0}
          max={deckSize}
        />
        <SliderInput
          label="Cards Drawn"
          value={drawCount}
          onChange={(v) => { setDrawCount(Math.min(v, deckSize)); setTargetMax(Math.min(targetMax, v)); setTargetMin(Math.min(targetMin, v)); } }
          min={1}
          max={deckSize}
        />
        <label style={{ margin: '10px', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={handSmoothing}
            onChange={(e) => setHandSmoothing(e.target.checked)}
            style={{ marginRight: '10px', width: '20px', height: '20px' }}
          />
          Hand smoothing (Bo1)
        </label>
      </div>
      <div className="container" style={{ alignItems: 'flex-start', padding: '10px' }}>
        <SliderInput
          label="Target number of lands: Min"
          value={targetMin}
          onChange={(v) => { setTargetMin(v); setTargetMax(Math.max(v, targetMax)); }}
          min={0}
          max={drawCount}
        />
        <SliderInput
          label="Max"
          value={targetMax}
          onChange={(v) => { setTargetMax(v); setTargetMin(Math.min(v, targetMin)); }}
          min={0}
          max={drawCount}
        />
      </div>
      <div className="info">
        <h2>
          Probability of {
            targetMin === targetMax
              ? `exactly ${targetMin}`
              : targetMin === 0 && targetMax < drawCount
              ? `at most ${targetMax}`
              : targetMax === drawCount && targetMin > 0
              ? `at least ${targetMin}`
              : `${targetMin}-${targetMax}`
          } lands:{' '}
          <span className="large" style={{ color: '#58a6ff' }}>{(targetProbability * 100).toFixed(2)}%</span>
        </h2>
      </div>
      <div className="chart" style={{ maxWidth: '800px', margin: '20px auto' }}>
        <div style={{ border: '1px solid white', padding: '20px' }}>
          <Pie data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [now, setNow] = useState(new Date());
  const [set, setSet] = useState(presentSet(now));

  // Initialize calculator mode from URL
  const getInitialMode = (): 'mastery' | 'packs' | 'land' => {
    const hash = window.location.hash;
    if (hash === '#packs') return 'packs';
    if (hash === '#land') return 'land';
    return 'mastery';
  };

  const [calculatorMode, setCalculatorMode] = useState<'mastery' | 'packs' | 'land'>(getInitialMode());
  const nowClipped = now < set.startDate ? set.startDate : now;
  const isCurrentSet = set.code === presentSet(now).code;
  const {questsLeft} = getTimeLeft(nowClipped, set);
  const [questCompletion, setQuestCompletion] = useState<number | undefined>(undefined);
  const [dailyWins, setDailyWins] = useState(4);  
  const [weeklyWins, setWeeklyWins] = useState(15);

  // Initialize from localStorage
  const [currentXPBySet, setCurrentXPBySet] = useState<{ [key: string]: number }>(() => {
    try {
      const stored = localStorage.getItem('currentXPBySet');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const currentXP = currentXPBySet[set.code] ?? 0;
  const setCurrentXP = (xpOrUpdater: number | ((prev: number) => number)) => {
    setCurrentXPBySet(prev => ({
      ...prev,
      [set.code]: typeof xpOrUpdater === 'function' ? xpOrUpdater(prev[set.code] ?? 0) : xpOrUpdater
    }));
  };
  const [remQuests, setRemQuests] = useState(0);
  const [remDailyWins, setRemDailyWins] = useState(0);
  const [remWeeklyWins, setRemWeeklyWins] = useState(0);
  const timeRemainaing = getDifferenceInTime(nowClipped, set.endDate);
  const totalXP = getXPForDate(set.startDate, set);
  const remainingXP = getXPForDate(nowClipped, set);
  const estimatedXP = getXPForDate(nowClipped, set, dailyWins, weeklyWins, questCompletion);
  const weeklyGold = getGoldPerWeek(dailyWins, questsLeft ? ((questCompletion ?? questsLeft) / questsLeft) : 1);
  const maxXP = estimatedXP + currentXP + (isCurrentSet ? remQuests * 500 + remDailyWins * 25 + remWeeklyWins * 250 : 0);
  const graphDates = getDatesBetween(set, 24);
  const maxLevel = set.maxLevel;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Save currentXPBySet to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentXPBySet', JSON.stringify(currentXPBySet));
  }, [currentXPBySet]);

  // Update URL when calculator mode changes
  useEffect(() => {
    const hash = `#${calculatorMode}`;
    if (window.location.hash !== hash) window.location.hash = hash;
  }, [calculatorMode]);

  useEffect(() => {
    const handleHashChange = () => { setCalculatorMode(getInitialMode()); };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const chartData = {
    labels: Array.from(graphDates, formatDate),
    datasets: [
      {
        label: 'Total XP',
        data: Array.from(graphDates, d => totalXP - getXPForDate(d, set)),
        borderColor: 'white',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        fill: false,
      },
      {
        label: 'Projected XP',
        data: Array.from(graphDates, d => d < now ? undefined : estimatedXP - getXPForDate(d, set, dailyWins, weeklyWins, questCompletion) + maxXP - estimatedXP),
        borderColor: 'yellow',
        backgroundColor: 'rgba(255, 255, 0, 0.5)',
        fill: false,
      },
      ...(maxLevel ? [{
        label: 'Max Level XP',
        data: Array.from(graphDates, d => (maxLevel-1)*1000),
        borderColor: 'green',
        backgroundColor: 'rgba(0, 255, 0, 0.2)',
        fill: false,
        pointRadius: 0,
      }] : []),
    ],
  };


  return (
    <div className="app">
      <div className="header">
        <select value={set.code} onChange={e => setSet(sets.find(s => s.code === e.target.value) ?? set)}>
          {sets.map(s => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <a
          href="https://github.com/mtga-mastery-calculator/mtga-mastery-calculator.github.io/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
        >
          Report issues & suggestions
        </a>
      </div>
      <h1>MTGA Calculator</h1>
      <div className="calculator-switcher">
        <button
          className={calculatorMode === 'mastery' ? 'active' : ''}
          onClick={() => setCalculatorMode('mastery')}
        >
          Mastery Progress
        </button>
        <button
          className={calculatorMode === 'packs' ? 'active' : ''}
          onClick={() => setCalculatorMode('packs')}
        >
          Packs to Wildcards
        </button>
        <button
          className={calculatorMode === 'land' ? 'active' : ''}
          onClick={() => setCalculatorMode('land')}
        >
          Land Draw
        </button>
      </div>
      {calculatorMode === 'packs' ? (
        <PacksCalculator set={set} />
      ) : calculatorMode === 'land' ? (
        <LandDrawCalculator />
      ) : (
        <>
      <div className="info">
        <h3><span className='large'>{set.name}: {formatDate(set.startDate)} - {formatDate(set.endDate)}</span></h3>
        <h3>Time Remaining: {now > set.endDate ? `Expired (lasted ${Math.ceil((set.endDate.getTime() - set.startDate.getTime()) / (1000 * 60 * 60 * 24))} days)` : `${timeRemainaing.days}d ${timeRemainaing.hours}h ${timeRemainaing.minutes}m`}</h3>
        <h2>Remaining XP: <span className="large"><FormattedXP xp={remainingXP}/></span>/<FormattedXP xp={totalXP}/></h2>
      </div>
      <div className="container">
        <SliderInput
          label="Expected quest completion"
          value={Math.min(questCompletion ?? questsLeft, questsLeft)}
          onChange={v => setQuestCompletion(v)}
          min={0}
          max={questsLeft}
        />
        <SliderInput
          label="Expected daily wins"
          value={dailyWins}
          onChange={v => {
            setDailyWins(v);
            setWeeklyWins(Math.max(weeklyWins, v));
          }}
          min={0}
          max={15}
        />
        <SliderInput
          label="Expected weekly wins"
          value={weeklyWins}
          onChange={v => setWeeklyWins(v)}
          min={0}
          max={15}
        />
      </div>
      <div className="info">
        <h2>Projcted XP to earn: <span className="large"><FormattedXP xp={estimatedXP}/></span></h2>
        <h3>Avg weekly gold: <span className="large"><FormattedXP xp={weeklyGold.avg}/></span> (<FormattedXP xp={weeklyGold.min}/> - <FormattedXP xp={weeklyGold.max}/>)</h3>
      </div>
      <div className="chart">
        <div style={{ border: '1px solid white', padding: '20px' }}>
            <Line data={chartData} />
        </div>
      </div>
      <div className="container">
      <SliderInput
        label="Current Level"
        value={xpToLevel(currentXP)}
        onChange={v => setCurrentXP(level => level % 1000 + (v - 1) * 1000)}
        min={1}
        max={100}
      />
      <SliderInput
        label="Current XP"
        value={currentXP%1000}
        onChange={v => setCurrentXP(level => level - level % 1000 + v)}
        min={0}
        max={975}
        step={25}
      />
      </div>
      {isCurrentSet && <div className='container'>
      <SliderInput
        label="Incomplete Quests"
        value={remQuests}
        onChange={v => setRemQuests(v)}
        min={0}
        max={3}
      />
      <SliderInput
        label="Incomplete Daily Wins"
        value={remDailyWins}
        onChange={v => setRemDailyWins(v)}
        min={0}
        max={10}
      />
      <SliderInput
        label="Incomplete Weekly Wins"
        value={remWeeklyWins}
        onChange={v => setRemWeeklyWins(v)}
        min={0}
        max={15}
      />
      </div>}
      <div className="info">
        <h2>Target level: <span className="large">{xpToLevel(maxXP)}</span>{maxLevel && <span>/{maxLevel}</span>}</h2>
      </div>
      {set.rewards &&
      <div className="rewards">
        <div>
          <h2>Current rewards</h2>
          <ul>
            {aggregateRewards(set.rewards, xpToLevel(0), xpToLevel(currentXP)).map(reward => <RewardItem {...reward} />)}
          </ul>
        </div>
        <div>
          <h2>Expected rewards</h2>
          <ul>
            {aggregateRewards(set.rewards, xpToLevel(currentXP) + 1, xpToLevel(maxXP)).map(reward => <RewardItem {...reward} />)}
          </ul>
        </div>
        <div>
          <h2>Missed rewards</h2>
          <ul>
            {aggregateRewards(set.rewards, xpToLevel(maxXP) + 1, xpToLevel(totalXP)).map(reward => <RewardItem {...reward} />)}
          </ul>
        </div>
      </div>
      }
      </>
      )}
    </div>
  );
};

export default App;