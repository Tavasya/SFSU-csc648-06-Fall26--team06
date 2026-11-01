
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    Upload,
    CalendarDays,
    Check,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Plus,
    Trash2,
    ArrowLeft,
    ArrowRight,
    RefreshCw,
    Info,
    FileImage,
} from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatClassName(value) {
    const cleaned = value.trim().replace(/\s+/g, " ");

    // csc648, csc 648, CSC-648 -> CSC 648
    const match = cleaned.match(/^([a-zA-Z]+)[\s-]*(\d+[a-zA-Z]?)$/);

    if (match) {
        return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
    }

    // Other course names become uppercase
    return cleaned.toUpperCase();
}

function formatDays(value) {
    const dayMap = {
        mon: "Mon",
        monday: "Mon",
        tue: "Tue",
        tues: "Tue",
        tuesday: "Tue",
        wed: "Wed",
        wednesday: "Wed",
        thu: "Thu",
        thur: "Thu",
        thurs: "Thu",
        thursday: "Thu",
        fri: "Fri",
        friday: "Fri",
        sat: "Sat",
        saturday: "Sat",
        sun: "Sun",
        sunday: "Sun",
    };

    return [...new Set(
        value
            .split(/[,;/]+/)
            .map((day) => day.trim().toLowerCase())
            .filter(Boolean)
            .map((day) => dayMap[day] || day)
    )].join(", ");
}

function formatTime12Hour(value) {
    if (!value) return "";

    const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return value;

    const hours = Number(match[1]);
    const minutes = match[2];

    if (hours > 23 || Number(minutes) > 59) return value;

    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${minutes} ${period}`;
}


function emptyClass() {
    return {
        id: crypto.randomUUID(),
        name: "",
        days: "",
        startTime: "",
        endTime: "",
    };
}

function StepIndicator({ step }) {
    const steps = ["Upload", "Review", "Confirm"];

    return (
        <div className="flex flex-wrap items-center gap-3 text-sm">
            {steps.map((label, index) => {
                const number = index + 1;
                const active = step === number;
                const completed = step > number;

                return (
                    <div key={label} className="flex items-center gap-3">
                        {index > 0 && (
                            <div className="h-px w-6 bg-gray-300" />
                        )}

                        <div className="flex items-center gap-2">
                            <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${active || completed
                                    ? "bg-[#65449B] text-white"
                                    : "bg-[#EBE7F2] text-gray-500"
                                    }`}
                            >
                                {completed ? <Check size={14} /> : number}
                            </span>

                            <span
                                className={
                                    active
                                        ? "font-semibold text-[#292437]"
                                        : "text-gray-500"
                                }
                            >
                                {label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function SchedulePage() {
    const [step, setStep] = useState(1);
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [classes, setClasses] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loadingSchedule, setLoadingSchedule] = useState(true);
    const [hasSavedSchedule, setHasSavedSchedule] = useState(false);

    const fileInput = useRef(null);
    const scanController = useRef(null);
    const scanVersion = useRef(0);
    const scanningRef = useRef(false);
    const scheduleEditedRef = useRef(false);

    useEffect(() => {
        return () => {
            scanController.current?.abort();
        };
    }, []);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);


    useEffect(() => {
        const controller = new AbortController();

        async function loadSavedSchedule() {
            try {
                const response = await fetch(
                    "/api/users/me/schedule",
                    {
                        method: "GET",
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (response.status === 401) {
                    // Students who aren't signed in can still
                    // upload or enter classes locally.
                    return;
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Unable to load your saved schedule."
                    );
                }

                // Don't overwrite an upload or edit made while loading.
                if (controller.signal.aborted || scheduleEditedRef.current) {
                    return;
                }

                if (Array.isArray(data.classes) && data.classes.length > 0) {
                    const savedClasses = data.classes.map((course) => ({
                        id: course.id || crypto.randomUUID(),
                        name: formatClassName(course.name || ""),
                        days: formatDays(course.days || ""),
                        startTime: course.startTime || "",
                        endTime: course.endTime || "",
                    }));

                    setClasses(savedClasses);
                    setSaved(true);
                    setHasSavedSchedule(true);
                    setStep(3);
                }
            } catch (error) {
                if (!controller.signal.aborted && error.name !== "AbortError") {
                    console.error("Load schedule error:", error);
                    setError(error.message || "Unable to load your schedule.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingSchedule(false);
                }
            }
        }

        loadSavedSchedule();

        return () => controller.abort();
    }, []);


    function cancelScan() {
        scanVersion.current += 1;
        scanController.current?.abort();
        scanController.current = null;
        scanningRef.current = false;
        setScanning(false);
    }

    function resetSchedule() {
        scheduleEditedRef.current = true;
        setSaved(false);
        cancelScan();
        setImage(null);
        setPreview(null);
        setClasses([]);
        setError("");
        setManualMode(false);
        setStep(1);

        if (fileInput.current) {
            fileInput.current.value = "";
        }
    }

    function handleFile(file) {
        scheduleEditedRef.current = true;
        setSaved(false);
        if (!file) return;

        // Invalidate previous scans before processing another file.
        cancelScan();
        setError("");

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError(
                "Unsupported file. Please upload a PNG, JPG, or WebP image."
            );
            return;
        }

        if (file.size === 0 || file.size > MAX_SIZE) {
            setError("Please upload an image smaller than 5 MB.");
            return;
        }

        setImage(file);
        setPreview(URL.createObjectURL(file));
        setClasses([]);
        setManualMode(false);
        setStep(1);
    }

    function handleFileInput(event) {
        const file = event.target.files?.[0];
        handleFile(file);

        // Allow selecting the same file again.
        event.target.value = "";
    }

    function handleDrop(event) {
        event.preventDefault();
        setDragging(false);

        const file = event.dataTransfer.files?.[0];
        handleFile(file);
    }

    async function handleScan() {
        if (!image || scanningRef.current) return;

        const version = ++scanVersion.current;
        const controller = new AbortController();

        scanController.current = controller;
        scanningRef.current = true;

        setScanning(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("image", image);

            const response = await fetch(
                "/api/users/me/schedule/scan",
                {
                    method: "POST",
                    body: formData,
                    signal: controller.signal,
                }
            );

            const text = await response.text();

            if (version !== scanVersion.current) return;

            if (!text) {
                throw new Error(
                    `The server returned an empty response (HTTP ${response.status}).`
                );
            }

            let data;

            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(
                    "The server returned an invalid response."
                );
            }

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(
                        "Gemini's API limit has been reached. Please wait for your quota to reset before scanning again, or add classes manually."
                    );
                }

                if (response.status === 503) {
                    throw new Error(
                        "Gemini is temporarily busy. Please try again shortly."
                    );
                }

                throw new Error(
                    data.error || `Scanning failed (HTTP ${response.status}).`
                );
            }

            if (!Array.isArray(data.classes)) {
                throw new Error("Invalid class schedule data.");
            }


            const extracted = data.classes.map((course) => ({
                id: crypto.randomUUID(),
                name: formatClassName(course.name || ""),
                days: formatDays(course.days || ""),
                startTime: course.startTime || "",
                endTime: course.endTime || "",
            }));


            if (version !== scanVersion.current) return;

            if (extracted.length === 0) {
                setError(
                    "No classes were detected. Try a clearer screenshot or enter classes manually."
                );
                return;
            }

            setClasses(extracted);
            setManualMode(false);
            setStep(2);
        } catch (err) {
            if (version !== scanVersion.current) return;

            if (err.name !== "AbortError") {
                console.error("Schedule scanning failed:", err);
                setError(err.message || "Unable to scan schedule.");
            }
        } finally {
            if (version === scanVersion.current) {
                scanningRef.current = false;
                scanController.current = null;
                setScanning(false);
            }
        }
    }

    function startManualEntry() {
        scheduleEditedRef.current = true;
        setSaved(false);
        cancelScan();
        setError("");
        setManualMode(true);
        setClasses((previous) =>
            previous.length ? previous : [emptyClass()]
        );
        setStep(2);
    }

    function addClass() {
        scheduleEditedRef.current = true;
        setSaved(false);
        setClasses((previous) => [...previous, emptyClass()]);
    }


    function updateClass(id, field, value) {
        setSaved(false);

        setClasses((previous) =>
            previous.map((course) =>
                course.id === id
                    ? { ...course, [field]: value }
                    : course
            )
        );
    }

    function normalizeClassField(id, field) {
        setClasses((previous) =>
            previous.map((course) => {
                if (course.id !== id) return course;

                if (field === "name") {
                    return {
                        ...course,
                        name: formatClassName(course.name),
                    };
                }

                if (field === "days") {
                    return {
                        ...course,
                        days: formatDays(course.days),
                    };
                }

                return course;
            })
        );
    }


    function removeClass(id) {
        scheduleEditedRef.current = true;
        setSaved(false);
        setClasses((previous) =>
            previous.filter((course) => course.id !== id)
        );
    }


    function validSchedule() {
        if (classes.length === 0) return false;

        return classes.every((course) => {
            const days = formatDays(course.days)
                .split(",")
                .map((day) => day.trim());

            return (
                formatClassName(course.name).length > 0 &&
                days.length > 0 &&
                days.every((day) => DAYS.includes(day)) &&
                course.startTime &&
                course.endTime &&
                course.startTime < course.endTime
            );
        });
    }



    function proceedToConfirm() {
        if (classes.length === 0) {
            setError("Please add at least one class.");
            return;
        }

        for (let index = 0; index < classes.length; index++) {
            const course = classes[index];

            const name = formatClassName(course.name);
            const days = formatDays(course.days)
                .split(",")
                .map((day) => day.trim());

            if (!name) {
                setError(`Class ${index + 1}: Please enter a class name.`);
                return;
            }

            if (!days.length || !days.every((day) => DAYS.includes(day))) {
                setError(`Class ${index + 1}: Please enter valid meeting days.`);
                return;
            }

            if (!course.startTime || !course.endTime) {
                setError(`Class ${index + 1}: Please enter both class times.`);
                return;
            }

            if (course.startTime >= course.endTime) {
                setError(
                    `Class ${index + 1} (${name}): End time must be later than start time. Check AM and PM.`
                );
                return;
            }
        }

        setClasses((previous) =>
            previous.map((course) => ({
                ...course,
                name: formatClassName(course.name),
                days: formatDays(course.days),
            }))
        );

        setError("");
        setStep(3);
    }



    async function confirmSchedule() {
        if (saving) return;

        if (!validSchedule()) {
            setError("Please review your class information.");
            setStep(2);
            return;
        }

        setSaving(true);
        setError("");

        try {
            const response = await fetch(
                "/api/users/me/schedule",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ classes }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to save your schedule."
                );
            }

            setSaved(true);
        } catch (error) {
            setError(
                error.message || "Unable to save your schedule."
            );
        } finally {
            setSaving(false);
        }
    }


    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#65449B]">
                    AI Schedule Scanner
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-[#292437]">
                    Set up your class schedule
                </h1>

                <p className="mt-2 text-sm text-[#777184]">
                    Upload a screenshot of your schedule. We'll pull out your
                    classes so recommendations can fit your free time.
                </p>
            </div>

            <div className="mb-7">
                <StepIndicator step={step} />
            </div>
            {loadingSchedule && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#E8E3EF] bg-white p-4 text-sm text-gray-600">
                    <Loader2
                        size={18}
                        className="animate-spin text-[#65449B]"
                    />
                    Loading your saved schedule...
                </div>
            )}

            {error && (
                <div
                    role="alert"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-[#FFF0EE] p-4 text-sm text-red-800"
                >
                    <AlertCircle size={19} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {!loadingSchedule && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="min-w-0">
                        {step === 1 && (
                            <div className="space-y-4">
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleFileInput}
                                />

                                {scanning ? (
                                    <div className="rounded-2xl border border-[#E8E3EF] bg-white p-6 shadow-sm">
                                        <div className="mb-5 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <FileImage
                                                    size={22}
                                                    className="text-[#65449B]"
                                                />
                                                <div>
                                                    <p className="font-semibold text-[#292437]">
                                                        {image?.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Reading your class schedule
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={cancelScan}
                                                className="text-sm font-medium text-[#65449B]"
                                            >
                                                Cancel
                                            </button>
                                        </div>

                                        <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#EEEAF4]">
                                            <div className="h-full w-2/3 animate-pulse rounded-full bg-[#65449B]" />
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Loader2
                                                size={17}
                                                className="animate-spin text-[#65449B]"
                                            />
                                            Finding class names, days, and times...
                                        </div>

                                        <p className="mt-4 text-xs text-gray-400">
                                            AI results may contain mistakes. You'll review
                                            everything before confirming.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            onDragOver={(event) => {
                                                event.preventDefault();
                                                setDragging(true);
                                            }}
                                            onDragLeave={() => setDragging(false)}
                                            onDrop={handleDrop}
                                            className={`rounded-2xl border-2 border-dashed bg-white px-5 py-12 text-center transition ${dragging
                                                ? "border-[#65449B] bg-[#F4F0FB]"
                                                : "border-[#BCA9DD]"
                                                }`}
                                        >
                                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F1FA] text-[#65449B]">
                                                <CalendarDays size={25} />
                                            </div>

                                            <h2 className="font-semibold text-[#292437]">
                                                Drag a screenshot of your class schedule here
                                            </h2>

                                            <p className="mt-2 text-sm text-gray-500">
                                                PNG, JPG, or WebP · up to 5 MB
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() => fileInput.current?.click()}
                                                className="mt-5 rounded-full bg-[#65449B] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#523783]"
                                            >
                                                Choose file
                                            </button>
                                        </div>

                                        {image && (
                                            <div className="rounded-xl border border-[#E8E3EF] bg-white p-4">
                                                <div className="flex items-center gap-3">
                                                    <FileImage
                                                        size={22}
                                                        className="text-[#65449B]"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold">
                                                            {image.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Ready to scan
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={resetSchedule}
                                                        className="text-sm text-[#65449B]"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>

                                                {preview && (
                                                    <img
                                                        src={preview}
                                                        alt="Uploaded schedule preview"
                                                        className="mt-4 max-h-64 rounded-lg border object-contain"
                                                    />
                                                )}


                                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={handleScan}
                                                        disabled={scanning}
                                                        className="flex items-center gap-2 rounded-full bg-[#65449B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#523783] disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {error ? (
                                                            <>
                                                                <RefreshCw size={16} />
                                                                Retry Scan
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload size={16} />
                                                                Scan schedule with AI
                                                            </>
                                                        )}
                                                    </button>

                                                    {error && (
                                                        <p className="text-xs text-gray-500">
                                                            Your uploaded image is still available.
                                                        </p>
                                                    )}
                                                </div>

                                            </div>
                                        )}
                                    </>
                                )}

                                {!scanning && (
                                    <button
                                        type="button"
                                        onClick={startManualEntry}
                                        className="text-sm font-medium text-[#65449B] hover:underline"
                                    >
                                        Or add classes manually →
                                    </button>
                                )}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="rounded-2xl border border-[#E8E3EF] bg-white p-6 shadow-sm">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold text-[#292437]">
                                            Review your classes
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Check the extracted details before confirming.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addClass}
                                        className="flex items-center gap-2 rounded-full border border-[#D8CDE9] px-4 py-2 text-sm font-semibold text-[#65449B]"
                                    >
                                        <Plus size={16} />
                                        Add class
                                    </button>
                                </div>

                                <div className="mt-6 space-y-4">
                                    {classes.map((course, index) => (
                                        <div
                                            key={course.id}
                                            className="rounded-xl border border-[#E9E5F0] bg-[#FBFAFD] p-4"
                                        >
                                            <div className="mb-4 flex items-center justify-between">
                                                <h3 className="font-semibold text-[#292437]">
                                                    Class {index + 1}
                                                </h3>

                                                <button
                                                    type="button"
                                                    onClick={() => removeClass(course.id)}
                                                    className="flex items-center gap-1 text-sm text-red-600"
                                                >
                                                    <Trash2 size={15} />
                                                    Remove
                                                </button>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Class name
                                                    <input
                                                        value={course.name}
                                                        onBlur={() => normalizeClassField(course.id, "name")}
                                                        onChange={(event) =>
                                                            updateClass(
                                                                course.id,
                                                                "name",
                                                                event.target.value
                                                            )
                                                        }
                                                        placeholder="CSC 648"
                                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-[#65449B]"
                                                    />
                                                </label>

                                                <label className="text-sm font-medium text-gray-700">
                                                    Meeting days
                                                    <input
                                                        value={course.days}
                                                        onBlur={() => normalizeClassField(course.id, "days")}
                                                        onChange={(event) =>
                                                            updateClass(
                                                                course.id,
                                                                "days",
                                                                event.target.value
                                                            )
                                                        }
                                                        placeholder="Mon, Wed"
                                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-[#65449B]"
                                                    />
                                                </label>

                                                <label className="text-sm font-medium text-gray-700">
                                                    Start time
                                                    <input
                                                        type="time"
                                                        value={course.startTime}
                                                        onChange={(event) =>
                                                            updateClass(
                                                                course.id,
                                                                "startTime",
                                                                event.target.value
                                                            )
                                                        }
                                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3"
                                                    />
                                                </label>

                                                <label className="text-sm font-medium text-gray-700">
                                                    End time
                                                    <input
                                                        type="time"
                                                        value={course.endTime}
                                                        onChange={(event) =>
                                                            updateClass(
                                                                course.id,
                                                                "endTime",
                                                                event.target.value
                                                            )
                                                        }
                                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex flex-wrap justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={resetSchedule}
                                        className="flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700"
                                    >
                                        <ArrowLeft size={16} />
                                        Upload another
                                    </button>

                                    <button
                                        type="button"
                                        onClick={proceedToConfirm}
                                        className="flex items-center gap-2 rounded-full bg-[#65449B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#523783]"
                                    >
                                        Continue
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="rounded-2xl border border-[#E8E3EF] bg-white p-6 shadow-sm">
                                <div className="mb-5 flex items-center gap-3">
                                    <CheckCircle2
                                        size={27}
                                        className="text-green-600"
                                    />
                                    <div>
                                        <h2 className="text-xl font-bold text-[#292437]">
                                            Confirm your class schedule
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            Review the final details below.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {classes.map((course) => (
                                        <div
                                            key={course.id}
                                            className="rounded-xl border border-[#E9E5F0] bg-[#FBFAFD] p-4"
                                        >
                                            <p className="font-semibold text-[#292437]">
                                                {course.name}
                                            </p>

                                            <p className="mt-1 text-sm text-gray-600">
                                                {course.days} · {formatTime12Hour(course.startTime)}
                                                {" – "}
                                                {formatTime12Hour(course.endTime)}
                                            </p>

                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex flex-wrap justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError("");
                                            setStep(2);
                                        }}
                                        className="flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm"
                                    >
                                        <ArrowLeft size={16} />
                                        Back to review
                                    </button>


                                    <button
                                        type="button"
                                        onClick={confirmSchedule}
                                        disabled={saving || saved}
                                        className="rounded-full bg-[#65449B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#523783] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {saving
                                            ? "Saving schedule..."
                                            : saved
                                                ? "Schedule saved!"
                                                : "Confirm schedule"}
                                    </button>

                                </div>
                            </div>
                        )}
                    </div>

                    <aside className="h-fit rounded-2xl border border-[#E8E3EF] bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <Info size={18} className="text-[#65449B]" />
                            <h2 className="font-semibold text-[#292437]">
                                How your schedule is used
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {[
                                "Helps identify campus events that fit your availability.",
                                "AI may make mistakes, so you can review and correct every class.",
                                "Only confirmed class information will be eligible for saving.",
                                "You can replace your schedule or enter classes manually.",
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-2">
                                    <Check
                                        size={17}
                                        className="mt-0.5 shrink-0 text-green-600"
                                    />
                                    <p className="text-sm leading-relaxed text-gray-600">
                                        {item}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <Link
                            href="/events"
                            className="mt-6 inline-block text-sm font-medium text-[#65449B] hover:underline"
                        >
                            Skip for now — explore events
                        </Link>
                    </aside>
                </div>
            )}
        </div>
    );
}
