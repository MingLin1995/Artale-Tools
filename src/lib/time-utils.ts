export function getWeekBounds(offsetWeeks: number = 0) {
    const now = new Date();

    // 一週的開始是 UTC 時間週四 00:00:00。
    const daysSinceLastThursday = (now.getUTCDay() - 4 + 7) % 7;

    // 計算當前週期的開始時間
    const startOfCurrentUTCWeek = new Date(now);
    startOfCurrentUTCWeek.setUTCDate(now.getUTCDate() - daysSinceLastThursday);
    startOfCurrentUTCWeek.setUTCHours(0, 0, 0, 0);

    const weekStart = new Date(startOfCurrentUTCWeek);
    weekStart.setUTCDate(weekStart.getUTCDate() + (offsetWeeks * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    weekEnd.setUTCMilliseconds(weekEnd.getUTCMilliseconds() - 1);

    const toTaipeiDate = (d: Date) => new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const weekdaySymbol = ['日', '一', '二', '三', '四', '五', '六'];

    const formatTaipeiDatePart = (d: Date) => {
        const taipeiDate = toTaipeiDate(d);
        const month = taipeiDate.getMonth() + 1;
        const day = taipeiDate.getDate();
        const weekday = weekdaySymbol[taipeiDate.getDay()];
        return `${month}/${day}(${weekday})`;
    };
    
    const formatTaipeiDateOnly = (d: Date) => {
        const taipeiDate = toTaipeiDate(d);
        const month = taipeiDate.getMonth() + 1;
        const day = taipeiDate.getDate();
        const weekday = weekdaySymbol[taipeiDate.getDay()];
        return `${month}/${day}(${weekday})`;
    };

    return {
        start: weekStart,
        end: weekEnd,
        label: `${formatTaipeiDatePart(weekStart)} 08:00 ~ ${formatTaipeiDateOnly(weekEnd)} 08:00`
    };
}

export default { getWeekBounds };
