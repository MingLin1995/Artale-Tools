"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getWeekBounds } from "@/lib/time-utils";
import Link from "next/link";

interface AvailabilitySlot {
    id?: number;
    user_id: number;
    start_time: string;
    end_time: string;
}

export default function SchedulerPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<number | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

    const [availabilityHeatmap, setAvailabilityHeatmap] = useState<
        Map<string, number>
    >(new Map());

    const [availabilityLoading, setAvailabilityLoading] = useState(true);
    const [availabilityMessage, setAvailabilityMessage] = useState("");

    const [isDragging, setIsDragging] = useState(false);
    const [dragStartSlot, setDragStartSlot] = useState<{
        dayIndex: number;
        hour: number;
    } | null>(null);
    const [dragMode, setDragMode] = useState<"select" | "deselect" | null>(null);
    const [draggedSlots, setDraggedSlots] = useState<Set<string>>(new Set());

    const now = new Date();

    const currentWeekBounds = useMemo(
        () => getWeekBounds(weekOffset),
        [weekOffset]
    );
    const weekDates = useMemo(() => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(currentWeekBounds.start);
            day.setUTCDate(day.getUTCDate() + i);
            dates.push(day);
        }
        return dates;
    }, [currentWeekBounds.start]);

    useEffect(() => {
        const storedUserId = localStorage.getItem("userId");
        if (!storedUserId) router.push("/team-builder");
        else {
            setUserId(parseInt(storedUserId));
        }
    }, [router]);

    const fetchAllData = useCallback(async () => {
        if (!userId) return;
        setAvailabilityLoading(true);
        const week = weekOffset === 0 ? "current" : "next";

        const [userRes, allRes] = await Promise.all([
            fetch(`/api/availability?userId=${userId}&week=${week}`),
            fetch(`/api/availability?week=${week}`),
        ]);

        if (userRes.ok) {
            const data = await userRes.json();
            const newSelectedSlots = new Set<string>();
            data.availability.forEach((slot: AvailabilitySlot) => {
                for (
                    let d = new Date(slot.start_time);
                    d < new Date(slot.end_time);
                    d.setUTCHours(d.getUTCHours() + 1)
                ) {
                    newSelectedSlots.add(d.toISOString());
                }
            });
            setSelectedSlots(newSelectedSlots);
        } else setAvailabilityMessage("Failed to fetch your availability.");

        if (allRes.ok) {
            const data = await allRes.json();
            const heatmap = new Map<string, number>();
            data.availability.forEach((slot: AvailabilitySlot) => {
                for (
                    let d = new Date(slot.start_time);
                    d < new Date(slot.end_time);
                    d.setUTCHours(d.getUTCHours() + 1)
                ) {
                    const slotKey = d.toISOString();
                    heatmap.set(slotKey, (heatmap.get(slotKey) || 0) + 1);
                }
            });
            setAvailabilityHeatmap(heatmap);
        } else setAvailabilityMessage("Failed to fetch heatmap data.");

        setAvailabilityLoading(false);
    }, [userId, weekOffset]);

    useEffect(() => {
        if (userId) fetchAllData();
    }, [userId, fetchAllData]);

    const handleMouseDown = (dayIndex: number, hour: number) => {
        setIsDragging(true);
        const date = weekDates[dayIndex];
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        const startSlotDate = new Date(
            `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000+08:00`
        );
        const startSlotKey = startSlotDate.toISOString();

        const mode = selectedSlots.has(startSlotKey) ? "deselect" : "select";
        setDragMode(mode);
        setDragStartSlot({ dayIndex, hour });
        setDraggedSlots(new Set([startSlotKey]));
    };

    const handleMouseEnter = (dayIndex: number, hour: number) => {
        if (!isDragging || !dragStartSlot) return;
        const newDraggedSlots = new Set<string>();
        const minDay = Math.min(dragStartSlot.dayIndex, dayIndex);
        const maxDay = Math.max(dragStartSlot.dayIndex, dayIndex);
        const minHour = Math.min(dragStartSlot.hour, hour);
        const maxHour = Math.max(dragStartSlot.hour, hour);
        for (let d = minDay; d <= maxDay; d++) {
            for (let h = minHour; h <= maxHour; h++) {
                const date = weekDates[d];
                const year = date.getUTCFullYear();
                const month = date.getUTCMonth();
                const day = date.getUTCDate();
                const slotDate = new Date(
                    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00.000+08:00`
                );
                newDraggedSlots.add(slotDate.toISOString());
            }
        }
        setDraggedSlots(newDraggedSlots);
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setSelectedSlots((prev) => {
            const newSelected = new Set(prev);
            if (dragMode === "select")
                draggedSlots.forEach((s) => newSelected.add(s));
            else if (dragMode === "deselect")
                draggedSlots.forEach((s) => newSelected.delete(s));
            return newSelected;
        });
        setIsDragging(false);
        setDragStartSlot(null);
        setDragMode(null);
        setDraggedSlots(new Set());
    };

    const handleSubmitAvailability = async () => {
        if (!userId) {
            setAvailabilityMessage("User not logged in.");
            return;
        }
        setAvailabilityLoading(true);
        setAvailabilityMessage("");
        const slotsToSubmit: { startTime: string; endTime: string }[] = [];
        const sortedKeys = Array.from(selectedSlots).sort();
        if (sortedKeys.length > 0) {
            let currentStart = new Date(sortedKeys[0]);
            let currentEnd = new Date(currentStart);
            currentEnd.setUTCHours(currentEnd.getUTCHours() + 1);
            for (let i = 1; i < sortedKeys.length; i++) {
                const nextSlotStart = new Date(sortedKeys[i]);
                if (nextSlotStart.getTime() === currentEnd.getTime()) {
                    currentEnd.setUTCHours(currentEnd.getUTCHours() + 1);
                } else {
                    slotsToSubmit.push({
                        startTime: currentStart.toISOString(),
                        endTime: currentEnd.toISOString(),
                    });
                    currentStart = nextSlotStart;
                    currentEnd = new Date(currentStart);
                    currentEnd.setUTCHours(currentEnd.getUTCHours() + 1);
                }
            }
            slotsToSubmit.push({
                startTime: currentStart.toISOString(),
                endTime: currentEnd.toISOString(),
            });
        }
        try {
            const response = await fetch("/api/availability", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, weekOffset, slots: slotsToSubmit }),
            });
            if (response.ok) {
                setAvailabilityMessage("您的可用時間已儲存。");
                fetchAllData();
            } else {
                const errorData = await response.json();
                setAvailabilityMessage(errorData.error || "儲存可用時間失敗。");
            }
        } catch (error) {
            setAvailabilityMessage("提交可用時間時發生錯誤。");
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userJobClass");
        router.push("/team-builder");
    };

    const getHeatmapColor = (count: number): string => {
        if (count === 0) return "bg-gray-50 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700";
        if (count <= 2) return "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800";
        if (count <= 4) return "bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700";
        return "bg-orange-300 hover:bg-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500";
    };

    if (!userId)
        return <div className="text-center p-4">載入使用者資訊中...</div>;

    const days = ["日", "一", "二", "三", "四", "五", "六"];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const cycleStartUTC = new Date(currentWeekBounds.start);

    return (
        <main
            className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl p-4 md:p-8 space-y-6 bg-gray-50 rounded-lg shadow-md dark:bg-gray-700">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        拖曳選取有空的時間
                    </h1>
                    <Link href="/" className="text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 px-3 py-1.5">
                        返回首頁
                    </Link>
                </div>
                <div className="mb-6 text-center">
                    <button
                        onClick={() => {
                            setWeekOffset(0);
                        }}
                        className={`px-4 py-2 rounded-l-md ${weekOffset === 0
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-white"
                            } hover:bg-blue-700 transition-colors duration-200`}
                    >
                        當週
                    </button>
                    <button
                        onClick={() => {
                            setWeekOffset(1);
                        }}
                        className={`px-4 py-2 rounded-r-md ${weekOffset === 1
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-white"
                            } hover:bg-blue-700 transition-colors duration-200`}
                    >
                        下週
                    </button>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {currentWeekBounds.label}
                    </p>

                    <div className="w-full text-center mt-6">
                    <Link
                        href="/matches"
                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        查看配對結果
                    </Link>
                </div>
                </div>
                

                {availabilityLoading ? (
                    <p className="text-center text-gray-700 dark:text-gray-300">載入可用時間中...</p>
                ) : (
                    <div className="overflow-x-auto bg-gray-10 rounded-lg shadow-md p-4 select-none">
                        <div className="grid grid-cols-8 gap-1 text-xs sm:text-sm">
                            <div className="col-span-1 border-b border-gray-400 dark:border-gray-600 text-center font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 flex items-center justify-center py-2">
                                時間
                            </div>
                            {weekDates.map((date, index) => (
                                <div
                                    key={index}
                                    className="col-span-1 border-b border-gray-400 dark:border-gray-600 text-center font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 flex items-center justify-center py-2"
                                >
                                    {`${date.getUTCMonth() + 1}/${date.getUTCDate()}`}
                                    <br />
                                    {`(${days[date.getUTCDay()]})`}
                                </div>
                            ))}
                            {hours.map((hour) => (
                                <div key={hour} className="contents">
                                    <div className="col-span-1 py-1 h-8 text-center border-b border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                                        {`${String(hour).padStart(2, "0")}:00`}
                                    </div>
                                    {weekDates.map((date, dayIndex) => {
                                        const TPE_YEAR = date.getUTCFullYear();
                                        const TPE_MONTH = date.getUTCMonth();
                                        const TPE_DAY = date.getUTCDate();

                                        const slotDate = new Date(
                                            `${TPE_YEAR}-${String(TPE_MONTH + 1).padStart(2, '0')}-${String(TPE_DAY).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000+08:00`
                                        );

                                        const isPast = slotDate < now;
                                        const isOutsideCycle = slotDate < cycleStartUTC;
                                        const isDisabled = isPast || isOutsideCycle;
                                        
                                        const slotKey = slotDate.toISOString();
                                        const isSelected = selectedSlots.has(slotKey);
                                        const isBeingDragged = draggedSlots.has(slotKey);
                                        const heatmapCount = availabilityHeatmap.get(slotKey) || 0;

                                        let cellClass = getHeatmapColor(heatmapCount);
                                        if (isSelected)
                                            cellClass = "bg-green-400 hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-500";
                                        if (isBeingDragged) {
                                            if (dragMode === "select") cellClass = "bg-blue-300 dark:bg-blue-600";
                                            else if (dragMode === "deselect")
                                                cellClass = "bg-red-300 dark:bg-red-600";
                                        }
                                        if (isDisabled) {
                                            cellClass = "bg-gray-200 cursor-not-allowed dark:bg-gray-700";
                                        }

                                        return (
                                            <div
                                                key={`${dayIndex}-${hour}`}
                                                className={`col-span-1 h-8 text-center border-b transition-colors duration-100 flex items-center justify-center text-gray-800 dark:text-white font-semibold ${cellClass} ${isDisabled ? "" : "cursor-pointer"
                                                    }`}
                                                onMouseDown={
                                                    !isDisabled
                                                        ? () => handleMouseDown(dayIndex, hour)
                                                        : undefined
                                                }
                                                onMouseEnter={
                                                    !isDisabled
                                                        ? () => handleMouseEnter(dayIndex, hour)
                                                        : undefined
                                                }
                                            >
                                                {heatmapCount > 0 && !isSelected && !isDisabled
                                                    ? heatmapCount
                                                    : ""}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <button
                        onClick={handleSubmitAvailability}
                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={availabilityLoading}
                    >
                        {availabilityLoading ? "儲存中..." : "儲存有空的時間"}
                    </button>
                    {availabilityMessage && (
                        <p className="mt-4 text-center text-sm font-medium text-blue-600 dark:text-blue-400">
                            {availabilityMessage}
                        </p>
                    )}
                </div>
                <button
                    onClick={logout}
                    className="mt-8 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    登出
                </button>
            </div>
        </main>
    );
}
