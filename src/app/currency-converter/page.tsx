'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const parseFormattedNumber = (str: string): number | null => {
    if (!str) return null;
    const cleanStr = str.replace(/,/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
};

const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const formatChineseNumber = (num: number | null): string => {
    if (num === null || num === 0) return '';

    const integerPart = Math.floor(Math.abs(num));
    if (integerPart === 0) return '';

    let result = '';
    let remaining = integerPart;

    const yi = Math.floor(remaining / 100000000);
    if (yi > 0) {
        result += `${formatNumber(yi)}億`;
        remaining %= 100000000;
    }

    const wan = Math.floor(remaining / 10000);
    if (wan > 0) {
        result += `${formatNumber(wan)}萬`;
        remaining %= 10000;
    }

    if (remaining > 0 || result === '') {
        result += formatNumber(remaining);
    }

    return result;
};

export default function CurrencyConverter() {
    const [rateInput, setRateInput] = useState('');
    const [snowflakeInput, setSnowflakeInput] = useState('');
    const [mapleInput, setMapleInput] = useState('');

    const rateValue = parseFormattedNumber(rateInput);
    const snowflakeValue = parseFormattedNumber(snowflakeInput);
    const mapleValue = parseFormattedNumber(mapleInput);

    const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const cleanValue = rawValue.replace(/[^0-9.]/g, '');
        if ((cleanValue.match(/\./g) || []).length > 1) return;

        setRateInput(cleanValue);

        const rate = parseFloat(cleanValue);
        const snowflake = parseFormattedNumber(snowflakeInput);

        if (!isNaN(rate) && snowflake !== null) {
            setMapleInput(formatNumber(snowflake * rate));
        }
    };

    const handleSnowflakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const cleanValue = rawValue.replace(/[^0-9.]/g, '');
        if ((cleanValue.match(/\./g) || []).length > 1) return;

        setSnowflakeInput(cleanValue);

        const snowflake = parseFloat(cleanValue);
        const rate = parseFormattedNumber(rateInput);

        if (!isNaN(snowflake) && rate !== null && rate !== 0) {
            setMapleInput(formatNumber(snowflake * rate));
        } else if (cleanValue === '') {
            setMapleInput('');
        }
    };

    const handleMapleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const cleanValue = rawValue.replace(/[^0-9.]/g, '');
        if ((cleanValue.match(/\./g) || []).length > 1) return;

        setMapleInput(cleanValue);

        const maple = parseFloat(cleanValue);
        const rate = parseFormattedNumber(rateInput);

        if (!isNaN(maple) && rate !== null && rate !== 0) {
            setSnowflakeInput(formatNumber(maple / rate));
        } else if (cleanValue === '') {
            setSnowflakeInput('');
        }
    };

    const handleBlur = (
        setter: React.Dispatch<React.SetStateAction<string>>,
        value: string
    ) => {
        const num = parseFormattedNumber(value);
        if (num !== null) {
            setter(formatNumber(num));
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        幣值換算計算機
                    </h1>
                    <Link href="/" className="text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 px-3 py-1.5">
                        返回首頁
                    </Link>
                </div>

                <div className="space-y-4">
                    {/* Exchange Rate Input */}
                    <div>
                        <label
                            htmlFor="rate"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            當前匯率 (1 雪花 = ? 楓幣)
                            <Link
                                href="https://artale-market.org/transaction?itemName=%E9%A3%84%E9%9B%AA%E7%B5%90%E6%99%B6&transactionType=sell&isActive=true&showDiscordUsername=true&timeRange=12"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-xs text-blue-600 underline hover:text-blue-800"
                            >
                                第三方查詢
                            </Link>
                            <span className="ml-1 text-xs text-gray-400 font-normal">或 拍賣內查詢</span>
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                                type="text"
                                id="rate"
                                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                placeholder="例如: 274,999"
                                value={rateInput}
                                onChange={handleRateChange}
                                onBlur={() => handleBlur(setRateInput, rateInput)}
                            />
                        </div>
                        {rateValue !== null && rateValue !== 0 && (
                            <div className="mt-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {formatChineseNumber(rateValue)}
                            </div>
                        )}
                    </div>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400">雙向換算</span>
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    </div>

                    {/* Snowflake Input */}
                    <div>
                        <label
                            htmlFor="snowflake"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            雪花數量
                        </label>
                        <input
                            type="text"
                            id="snowflake"
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            placeholder="輸入雪花"
                            value={snowflakeInput}
                            onChange={handleSnowflakeChange}
                            onBlur={() => handleBlur(setSnowflakeInput, snowflakeInput)}
                        />
                        {snowflakeValue !== null && snowflakeValue !== 0 && (
                            <div className="mt-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {formatChineseNumber(snowflakeValue)}
                            </div>
                        )}
                    </div>

                    {/* Maple Input */}
                    <div>
                        <label
                            htmlFor="maple"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            楓幣數量
                        </label>
                        <input
                            type="text"
                            id="maple"
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            placeholder="輸入楓幣"
                            value={mapleInput}
                            onChange={handleMapleChange}
                            onBlur={() => handleBlur(setMapleInput, mapleInput)}
                        />
                        {mapleValue !== null && mapleValue !== 0 && (
                            <div className="mt-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {formatChineseNumber(mapleValue)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    輸入任一欄位，自動換算另一欄位。
                </div>

            </div>
        </main>
    );
}
