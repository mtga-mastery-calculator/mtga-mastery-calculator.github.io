import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Set, sets, Rewards } from './sets';
import './styles/App.css';

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

const App = () => {
  const [now, setNow] = useState(new Date());
  const [set, setSet] = useState(presentSet(now));
  const nowClipped = now < set.startDate ? set.startDate : now;
  const {questsLeft} = getTimeLeft(nowClipped, set);
  const [questCompletion, setQuestCompletion] = useState<number | undefined>(undefined);
  const [dailyWins, setDailyWins] = useState(4);  
  const [weeklyWins, setWeeklyWins] = useState(15);
  const [currentXP, setCurrentXP] = useState(0);
  const [remQuests, setRemQuests] = useState(0);
  const [remDailyWins, setRemDailyWins] = useState(0);
  const [remWeeklyWins, setRemWeeklyWins] = useState(0);
  const timeRemainaing = getDifferenceInTime(nowClipped, set.endDate);
  const totalXP = getXPForDate(set.startDate, set);
  const remainingXP = getXPForDate(nowClipped, set);
  const estimatedXP = getXPForDate(nowClipped, set, dailyWins, weeklyWins, questCompletion);
  const weeklyGold = getGoldPerWeek(dailyWins, questsLeft ? ((questCompletion ?? questsLeft) / questsLeft) : 1);
  const maxXP = estimatedXP + currentXP + remQuests * 500 + remDailyWins * 25 + remWeeklyWins * 250;
  const graphDates = getDatesBetween(set, 24);
  const maxLevel = set.maxLevel;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
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
        <select value={set.code} onChange={e => setSet(sets.find(s => s.code === e.target.value) ?? set)}>
          {sets.map(s => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      <h1>MTGA Mastery Calculator</h1>
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
      <div className='container'>
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
      </div>
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
    </div>
  );
};

export default App;