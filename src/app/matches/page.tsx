'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getWeekBounds } from '@/lib/time-utils';
import { MatchedTeam } from '@/lib/types';
import Link from 'next/link';

export default function MatchesPage() {
    const router = useRouter();
    const [weekOffset, setWeekOffset] = useState(0); // 0 代表當週, 1 代表下週
    const [matches, setMatches] = useState<MatchedTeam[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const currentWeekBounds = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        setMessage('');
        setMatches([]);
        try {
            const response = await fetch(`/api/match?week=${weekOffset === 0 ? 'current' : 'next'}`);
            if (response.ok) {
                const data = await response.json();
                setMatches(data.matches || []);
                if (data.matches.length === 0) {
                    setMessage('此週目前沒有找到符合條件的隊伍組合。');
                }
            } else {
                setMessage('無法取得配對結果。');
            }
        } catch (error) {
            console.error('獲取配對時發生錯誤:', error);
            setMessage('取得配對結果時發生錯誤。');
        } finally {
            setLoading(false);
        }
    }, [weekOffset]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-xl p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        配對結果
                    </h1>
                    <Link href="/" className="text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 px-3 py-1.5">
                        返回首頁
                    </Link>
                </div>
            <div className="mb-6 text-center">
                <button
                    onClick={() => setWeekOffset(0)}
                    className={`px-4 py-2 rounded-l-md ${weekOffset === 0 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'} hover:bg-blue-700 transition-colors duration-200`}
                >
                    當週
                </button>
                <button
                    onClick={() => setWeekOffset(1)}
                    className={`px-4 py-2 rounded-r-md ${weekOffset === 1 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'} hover:bg-blue-700 transition-colors duration-200`}
                >
                    下週
                </button>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{currentWeekBounds.label}</p>
            </div>

            {loading ? (
                <p className="text-gray-700 dark:text-gray-300">載入中...</p>
            ) : matches.length > 0 ? (
                <div className="w-full bg-white rounded-lg shadow-md p-4 dark:bg-gray-700">
                    {matches.map((match, index) => (
                        <div key={index} className="mb-6 p-4 border border-gray-200 rounded-md">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">時間: {new Date(match.timeSlot).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</h3>
                            <div className="space-y-4">
                                {match.teams.map((team, teamIndex) => (
                                    <div key={teamIndex} className="border-t pt-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                                            組合 {teamIndex + 1}
                                            {team.length < 6 && <span className="ml-2 text-orange-600 font-bold">({team.length}/6人)</span>}
                                            :
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {team.map((player, pIndex) => (
                                                <div key={pIndex} className="bg-gray-200 p-2 rounded-md text-sm text-gray-800 dark:bg-gray-600 dark:text-white">
                                                    {player.name} ({player.job_class})
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-700 dark:text-gray-300">{message}</p>
            )}

            <button
                onClick={() => router.push('/scheduler')}
                className="mt-8 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                返回時間選擇
            </button>
            </div>

        </main>
    );
}