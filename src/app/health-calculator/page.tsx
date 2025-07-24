'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

const parseFormattedNumber = (str: string): number | null => {
  if (!str) return null;
  const num = parseInt(str.replace(/,/g, ''), 10);
  return isNaN(num) ? null : num;
};

export default function HealthCalculator() {
  const [maxHealthInput, setMaxHealthInput] = useState('');
  const [maxDamageInput, setMaxDamageInput] = useState('');
  const [healAmountInput, setHealAmountInput] = useState('');

  const handleNumericInputChange = (
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = rawValue.replace(/[^0-9]/g, '');
    if (numericValue === '') {
      setter('');
    } else {
      setter(parseInt(numericValue, 10).toLocaleString('en-US'));
    }
  };

  const maxHealth = useMemo(() => parseFormattedNumber(maxHealthInput), [maxHealthInput]);
  const maxDamage = useMemo(() => parseFormattedNumber(maxDamageInput), [maxDamageInput]);
  const healAmount = useMemo(() => parseFormattedNumber(healAmountInput), [healAmountInput]);

  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState<Array<{
    time: number;
    action: string;
    healthBefore: number;
    healthAfter: number;
    reason: string;
  }>>([]);

  const calculateOptimalHealPercent = useMemo(() => {
    if (!maxHealth || !maxDamage || !healAmount || maxHealth <= 0) {
      return { percent: 0, canSurvive: true, reason: '' };
    }

    if (maxDamage <= 0) {
      return { percent: 1, canSurvive: true, reason: '沒有傷害，任何設定都可以存活' };
    }

    if (healAmount <= 0) {
      return { percent: 0, canSurvive: false, reason: '補血量不足，無法存活' };
    }

    // 模擬戰鬥場景並記錄過程
    const simulateWithSteps = (healPercent: number): { survived: boolean; steps: typeof simulationSteps; effectiveHealThreshold: number } => {
      let healThreshold = maxHealth * (healPercent / 100);
      const minimumRequiredHealthToHealForNextHit = Math.max(1, maxDamage - healAmount + 1);
      const avoidOverHealThreshold = maxHealth - healAmount;
      healThreshold = Math.max(healThreshold, minimumRequiredHealthToHealForNextHit, avoidOverHealThreshold, maxDamage);
      healThreshold = Math.min(healThreshold, maxHealth);

      let currentHealth = maxHealth;
      const steps: typeof simulationSteps = [];
      
      // 第0秒：戰鬥開始，立即受到第一次攻擊
      const healthBeforeFirstAttack = currentHealth;
      currentHealth -= maxDamage;
      steps.push({
        time: 0,
        action: '受到攻擊',
        healthBefore: healthBeforeFirstAttack,
        healthAfter: currentHealth,
        reason: `戰鬥開始，受到 ${maxDamage.toLocaleString()} 點傷害 (補血閾值: ${Math.ceil((healThreshold / maxHealth) * 100)}%)`
      });

      // 檢查第一次攻擊後是否死亡
      if (currentHealth <= 0) {
        steps.push({
          time: 0,
          action: '死亡',
          healthBefore: currentHealth,
          healthAfter: 0,
          reason: '第一次攻擊後血量歸零，無法存活'
        });
        return { survived: false, steps, effectiveHealThreshold: healThreshold };
      }

      // 第0秒：攻擊後立即檢查是否需要補血
      const healthAfterFirstAttack = currentHealth;
      if (currentHealth <= healThreshold) {
        currentHealth = Math.min(currentHealth + healAmount, maxHealth);
        steps.push({
          time: 0,
          action: '立即補血',
          healthBefore: healthAfterFirstAttack,
          healthAfter: currentHealth,
          reason: `血量 ${healthAfterFirstAttack.toLocaleString()} ≤ ${healThreshold.toLocaleString()}, 立即補血 ${healAmount.toLocaleString()}`
        });
      } else {
        steps.push({
          time: 0,
          action: '檢查補血',
          healthBefore: healthAfterFirstAttack,
          healthAfter: currentHealth,
          reason: `血量 ${healthAfterFirstAttack.toLocaleString()} > ${healThreshold.toLocaleString()}, 不需補血`
        });
      }

      // 模擬接下來的10分鐘
      const simulationDurationMs = 600 * 1000;
      for (let timeMs = 100; timeMs <= simulationDurationMs; timeMs += 100) {
        const currentTime = timeMs / 1000;
        
        // 每1.5秒檢查是否需要補血 (從第1.5秒開始)
        if (Math.abs(currentTime % 1.5) < 0.05 && currentTime >= 1.5) {
          const healthBefore = currentHealth;
          if (currentHealth <= healThreshold) {
            currentHealth = Math.min(currentHealth + healAmount, maxHealth);
            steps.push({
              time: currentTime,
              action: '補血',
              healthBefore,
              healthAfter: currentHealth,
              reason: `血量 ${healthBefore.toLocaleString()} ≤ ${healThreshold.toLocaleString()}, 補血 ${healAmount.toLocaleString()}`
            });
          } else {
            steps.push({
              time: currentTime,
              action: '檢查補血',
              healthBefore,
              healthAfter: currentHealth,
              reason: `血量 ${healthBefore.toLocaleString()} > ${healThreshold.toLocaleString()}, 不需補血`
            });
          }
        }
        
        // 每2秒受到傷害 (從第2秒開始，因為第0秒已經受過第一次攻擊)
        if (Math.abs(currentTime % 2.0) < 0.05 && currentTime >= 2.0) {
          const healthBefore = currentHealth;
          currentHealth -= maxDamage;
          steps.push({
            time: currentTime,
            action: '受到攻擊',
            healthBefore,
            healthAfter: currentHealth,
            reason: `受到 ${maxDamage.toLocaleString()} 點傷害`
          });
          
          // 檢查是否死亡
          if (currentHealth <= 0) {
            steps.push({
              time: currentTime,
              action: '死亡',
              healthBefore: currentHealth,
              healthAfter: 0,
              reason: '血量歸零，無法存活'
            });
            return { survived: false, steps, effectiveHealThreshold: healThreshold };
          }
        }
      }
      
      return { survived: true, steps, effectiveHealThreshold: healThreshold };
    };;

    // 從1%開始測試到100%
    for (let percent = 1; percent <= 100; percent++) {
      const result = simulateWithSteps(percent);
      if (result.survived) {
        setSimulationSteps(result.steps);
        const effectivePercent = Math.ceil((result.effectiveHealThreshold / maxHealth) * 100);
        return { percent: effectivePercent, canSurvive: true, reason: '' };
      }
      
      if (percent === 1) {
        setSimulationSteps(result.steps);
      }
    }

    return { 
      percent: 0, 
      canSurvive: false, 
      reason: '補血量不足以抵抗傷害，建議增加補血量或減少受到的傷害' 
    };
  }, [maxHealth, maxDamage, healAmount]);

  const simpleCalculation = useMemo(() => {
    if (!maxHealth || !maxDamage || maxHealth <= 0 || maxDamage <= 0) return null;
    
    const remainingHealthPercent = Math.ceil(Math.max(0, (maxDamage / maxHealth) * 100));
    
    return remainingHealthPercent
  }, [maxHealth, maxDamage]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            血量計算機
            </h1>
            <Link href="/" className="text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 px-3 py-1.5">
                返回首頁
            </Link>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="maxHealth"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              總血量（開聖火後，就填寫開聖火後的血量）
            </label>
            <input
              type="text"
              id="maxHealth"
              placeholder="5,000"
              value={maxHealthInput}
              onChange={handleNumericInputChange(setMaxHealthInput)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="maxDamage"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              受到最高傷害
            </label>
            <input
              type="text"
              id="maxDamage"
              placeholder="1,950"
              value={maxDamageInput}
              onChange={handleNumericInputChange(setMaxDamageInput)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="healAmount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              每次補血量
            </label>
            <input
              type="text"
              id="healAmount"
              placeholder="2,000"
              value={healAmountInput}
              onChange={handleNumericInputChange(setHealAmountInput)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
        </div>
        <div className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            計算結果
          </h2>
          <div className="space-y-3">
            {/* 精確計算結果 */}
            <div className="p-4 bg-gray-50 rounded-lg dark:bg-gray-700">
              {calculateOptimalHealPercent.canSurvive && calculateOptimalHealPercent.percent > 0 && (
                <p className="text-gray-700 dark:text-gray-300">
                  寵物自動補血建議設定:{" "}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {calculateOptimalHealPercent.percent}%
                  </span>
                </p>
              )}
              {!calculateOptimalHealPercent.canSurvive && (
                <div>
                  <p className="text-red-500 dark:text-red-400 mb-2">
                    在當前設定下，會掛。
                  </p>
                  {calculateOptimalHealPercent.reason && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {calculateOptimalHealPercent.reason}
                    </p>
                  )}
                </div>
              )}
              
              {/* 顯示模擬過程按鈕 */}
              {simulationSteps.length > 0 && (
                <button
                  onClick={() => setShowSimulation(!showSimulation)}
                  className="mt-3 px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800"
                >
                  {showSimulation ? '隱藏' : '顯示'}模擬過程
                </button>
              )}
            </div>
            
            {/* 模擬過程詳細顯示 */}
            {showSimulation && simulationSteps.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-3">
                  戰鬥模擬過程 (10分鐘)
                </h3>
                <div className="space-y-2">
                  {simulationSteps.map((step, index) => (
                    <div 
                      key={index} 
                      className={`text-xs p-2 rounded border-l-2 ${
                        step.action === '死亡' 
                          ? 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-400' 
                          : step.action === '受到攻擊'
                          ? 'bg-orange-100 border-orange-400 dark:bg-orange-900/30 dark:border-orange-400'
                          : step.action === '補血'
                          ? 'bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-400'
                          : 'bg-gray-100 border-gray-400 dark:bg-gray-800 dark:border-gray-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="font-medium">
                            第 {step.time}秒 - {step.action}
                          </span>
                          <div className="mt-1 text-gray-600 dark:text-gray-300">
                            {step.reason}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-gray-500 dark:text-gray-400">
                            {step.healthBefore.toLocaleString()}
                          </div>
                          <div className="text-xs">↓</div>
                          <div className={`font-bold ${
                            step.healthAfter < step.healthBefore 
                              ? 'text-red-600 dark:text-red-400' 
                              : step.healthAfter > step.healthBefore
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}>
                            {step.healthAfter.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {simulationSteps.some(step => step.action === '死亡') && (
                  <div className="mt-3 p-2 bg-red-100 rounded dark:bg-red-900/30">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      💀 模擬顯示在此設定下會死亡
                    </p>
                  </div>
                )}
                {!simulationSteps.some(step => step.action === '死亡') && (
                  <div className="mt-3 p-2 bg-green-100 rounded dark:bg-green-900/30">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      ✅ 模擬顯示在此設定下可以安全存活
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* 簡單計算參考 */}
            {simpleCalculation && (
              <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                  快速參考計算 ( 傷害/血量 )
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  血量設置百分比： {simpleCalculation}%
                  <br />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    (僅在 總血量 & 每次補血量 ＞ 最高傷害 時可以參考)
                  </span>
                </p>
              </div>
            )}
          </div>
          
          {/* 使用說明 */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg dark:bg-yellow-900/20">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              使用說明
            </h3>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• 怪物每2秒攻擊一次</li>
              <li>• 寵物每1.5秒可以補血一次</li>
              <li>• 計算會考慮時間差和持續戰鬥的情況</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}