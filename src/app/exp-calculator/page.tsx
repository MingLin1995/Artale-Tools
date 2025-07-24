'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import expData from '../../exp.json';

interface ExpData {
  level: number;
  exp: number;
}

const parseFormattedNumber = (str: string): number | null => {
  if (!str) return null;
  const num = parseInt(str.replace(/,/g, ''), 10);
  return isNaN(num) ? null : num;
};

export default function Home() {
  const [targetLevelInput, setTargetLevelInput] = useState('');
  const [expPerTenMinutesInput, setExpPerTenMinutesInput] = useState('');
  const [potionsPerHourInput, setPotionsPerHourInput] = useState('');
  const [potionPriceInput, setPotionPriceInput] = useState('');
  const [snowflakePriceInput, setSnowflakePriceInput] = useState('');

  const handleNumericInputChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    validator?: (value: number) => number
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = rawValue.replace(/[^0-9]/g, '');
    if (numericValue === '') {
      setter('');
    } else {
      let num = parseInt(numericValue, 10);
      if (validator) {
        num = validator(num);
      }
      setter(num.toLocaleString('en-US'));
    }
  };

  const validateTargetLevel = (level: number): number => {
    if (level < 1) return 1;
    if (level > 200) return 200;
    return level;
  };

  const targetLevel = useMemo(() => parseFormattedNumber(targetLevelInput), [targetLevelInput]);
  const expPerTenMinutes = useMemo(() => parseFormattedNumber(expPerTenMinutesInput), [expPerTenMinutesInput]);
  const potionsPerHour = useMemo(() => parseFormattedNumber(potionsPerHourInput), [potionsPerHourInput]);
  const potionPrice = useMemo(() => parseFormattedNumber(potionPriceInput), [potionPriceInput]);
  const snowflakePrice = useMemo(() => parseFormattedNumber(snowflakePriceInput), [snowflakePriceInput]);


  const requiredExp = useMemo(() => {
    if (!targetLevel) return 0;
    const target = (expData as ExpData[]).find(
      (data) => data.level === targetLevel
    );
    return target ? target.exp : 0;
  }, [targetLevel]);

  const hoursToLevelUp = useMemo(() => {
    if (!requiredExp || !expPerTenMinutes) return 0;
    return (requiredExp / expPerTenMinutes) * (10 / 60);
  }, [requiredExp, expPerTenMinutes]);

  const formattedTimeToLevelUp = useMemo(() => {
    if (hoursToLevelUp <= 0) return '';
    const totalMinutes = Math.ceil(hoursToLevelUp * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let result = '';
    if (hours > 0) {
      result += `${hours.toLocaleString('en-US')} 小時 `;
    }
    if (minutes > 0) {
      result += `${minutes} 分鐘`;
    }
    return result.trim();
  }, [hoursToLevelUp]);

  const totalCost = useMemo(() => {
    if (!hoursToLevelUp || !potionsPerHour || !potionPrice) return 0;
    return hoursToLevelUp * potionsPerHour * potionPrice;
  }, [hoursToLevelUp, potionsPerHour, potionPrice]);

  const snowflakeCost = useMemo(() => {
    if (!totalCost || !snowflakePrice) return 0;
    return Math.ceil(totalCost / snowflakePrice);
  }, [totalCost, snowflakePrice]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            坐牢計算機
            </h1>
            <Link href="/" className="text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 px-3 py-1.5">
                返回首頁
            </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="targetLevel"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              目標等級 (1-200)
            </label>
            <input
              type="text"
              id="targetLevel"
              placeholder="120"
              value={targetLevelInput}
              onChange={handleNumericInputChange(setTargetLevelInput, validateTargetLevel)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="expPerTenMinutes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              每十分鐘經驗量
            </label>
            <input
              type="text"
              id="expPerTenMinutes"
              placeholder="600,000"
              value={expPerTenMinutesInput}
              onChange={handleNumericInputChange(setExpPerTenMinutesInput)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="potionsPerHour"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              每小時消耗補品數量
            </label>
            <input
              type="text"
              id="potionsPerHour"
              placeholder="1,000"
              value={potionsPerHourInput}
              onChange={handleNumericInputChange(setPotionsPerHourInput)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="potionPrice"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              每個補品價格
            </label>
            <input
              type="text"
              id="potionPrice"
              placeholder="2,185"
              value={potionPriceInput}
              onChange={handleNumericInputChange(setPotionPriceInput)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="snowflakePrice"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              當前雪花市價
            </label>
            <input
              type="text"
              id="snowflakePrice"
              placeholder="450,000"
              value={snowflakePriceInput}
              onChange={handleNumericInputChange(setSnowflakePriceInput)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
        </div>
        <div className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            計算結果
          </h2>
          <div className="p-4 bg-gray-50 rounded-lg dark:bg-gray-700">
            {requiredExp > 0 && (
              <p className="text-gray-700 dark:text-gray-300">
                升級所需經驗：{" "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {requiredExp.toLocaleString('en-US')}
                </span>
              </p>
            )}
            {hoursToLevelUp > 0 && isFinite(hoursToLevelUp) && (
              <p className="text-gray-700 dark:text-gray-300">
                升級所需時間：{" "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {formattedTimeToLevelUp}
                </span>
              </p>
            )}
            {totalCost > 0 && isFinite(totalCost) && (
              <p className="text-gray-700 dark:text-gray-300">
                升級所需費用：{" "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </p>
            )}
            {snowflakeCost > 0 && isFinite(snowflakeCost) && (
              <p className="text-gray-700 dark:text-gray-300">
                升級所需雪花：{" "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {snowflakeCost.toLocaleString('en-US')}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
