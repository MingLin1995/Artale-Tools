'use client';

import { useState, useEffect } from 'react';
import { jobClasses } from '@/lib/definitions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TeamBuilderPage() {
  const [name, setName] = useState('');
  const [jobClass, setJobClass] = useState(jobClasses[0]);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const existingUserId = localStorage.getItem('userId');
    if (existingUserId) {
      router.push('/scheduler');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSuccess(false);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, job_class: jobClass }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || `使用者 ${data.user.name} 資訊已儲存！`);
        setIsSuccess(true);

        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userJobClass', data.user.job_class);
        
        router.push('/scheduler');
      } else {
        setMessage(data.error || '儲存使用者資訊失敗。');
        setIsSuccess(false);
      }
    } catch (error) {
      console.error('提交錯誤:', error);
      setMessage('發生未預期的錯誤。');
      setIsSuccess(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          拉圖斯隊伍配對
        </h1>
        <Link href="/" className="text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 px-3 py-1.5">
          返回首頁
        </Link>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-900 dark:text-white text-center">輸入稱呼，選擇職業，自動登入</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              稱呼：
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="jobClass" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              職業：
            </label>
            <select
              id="jobClass"
              value={jobClass}
              onChange={(e) => setJobClass(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            >
              {jobClasses.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            儲存
          </button>
        </form>
                    {message && (
                  <p className={`mt-4 text-center text-sm font-medium ${isSuccess ? 'text-green-600' : 'text-red-600'} dark:text-gray-300`}>
                    {message}
                  </p>
                )}
              </div>
    </main>
  );
}
