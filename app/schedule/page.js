
"use client";

import { useRef, useState } from "react";

export default function SchedulePage() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [classes, setClasses] = useState([]);
    const [message, setMessage] = useState("");
    const [scanning, setScanning] = useState(false);
    const fileInput = useRef(null);


    function handleUpload(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setMessage("Please upload a PNG, JPG, or WebP image.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage("Image must be smaller than 5 MB.");
            event.target.value = "";
            return;
        }

        setImage(file);
        setPreview(URL.createObjectURL(file));
        setClasses([]);
        setMessage("");
    }


    function addClass() {
        setClasses([
            ...classes,
            {
                id: crypto.randomUUID(),
                name: "",
                days: "",
                startTime: "",
                endTime: "",
            },
        ]);
    }

    function updateClass(id, field, value) {
        setClasses((previous) =>
            previous.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    }

    function removeClass(id) {
        setClasses((previous) =>
            previous.filter((item) => item.id !== id)
        );
    }


    async function handleScan() {
        if (!image) {
            setMessage("Please upload your schedule first.");
            return;
        }

        setScanning(true);
        setMessage("AI is scanning your class schedule...");

        try {
            const formData = new FormData();
            formData.append("image", image);

            const response = await fetch(
                "/api/users/me/schedule/scan",
                {
                    method: "POST",
                    body: formData,
                }
            );

            const responseText = await response.text();

            if (!responseText) {
                throw new Error(
                    `The server returned an empty response (HTTP ${response.status}). Check your VS Code terminal.`
                );
            }

            let data;

            try {
                data = JSON.parse(responseText);
            } catch {
                throw new Error(
                    `The server returned invalid JSON (HTTP ${response.status}). Check your VS Code terminal.`
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    `Schedule scan failed (HTTP ${response.status}).`
                );
            }

            if (!Array.isArray(data.classes)) {
                throw new Error("Invalid schedule format.");
            }

            const extractedClasses = data.classes.map(
                (course) => ({
                    id: crypto.randomUUID(),
                    name: course.name || "",
                    days: course.days || "",
                    startTime: course.startTime || "",
                    endTime: course.endTime || "",
                })
            );

            setClasses(extractedClasses);

            if (extractedClasses.length === 0) {
                setMessage(
                    "No classes were detected. Please try again or add them manually below."
                );
            } else {
                setMessage(
                    `Successfully extracted ${extractedClasses.length} classes! You can review and edit them below.`
                );
            }
        } catch (error) {
            console.error("Error scanning schedule:", error);

            setMessage(
                error.message || "Something went wrong."
            );
        } finally {
            setScanning(false);
        }
    }



    function handleSave() {
        setMessage(
            "Schedule is ready. Database saving will be connected next."
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="mx-auto max-w-4xl space-y-8">

                <header>
                    <h1 className="text-3xl font-bold text-gray-900">
                        AI Schedule Scanner
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Upload your class schedule to discover campus
                        events that fit your availability.
                    </p>
                </header>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900">
                        Upload Class Schedule
                    </h2>

                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleUpload}
                        className="hidden"
                    />

                    <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                        <p className="mb-4 text-gray-600">
                            Upload a screenshot or photo of your class schedule.
                        </p>

                        <button
                            onClick={() => fileInput.current?.click()}
                            className="rounded-lg bg-purple-600 px-5 py-3 font-medium text-white hover:bg-purple-700"
                        >
                            Choose Image
                        </button>
                    </div>

                    {preview && (
                        <div className="mt-6">
                            <h3 className="mb-3 font-semibold text-gray-900">
                                Schedule Preview
                            </h3>

                            <img
                                src={preview}
                                alt="Uploaded class schedule"
                                className="max-h-96 rounded-lg border object-contain"
                            />


                            <button
                                onClick={handleScan}
                                disabled={scanning}
                                className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {scanning
                                    ? "Scanning Schedule..."
                                    : "Scan Schedule with AI"}
                            </button>

                        </div>
                    )}
                </section>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold text-gray-900">
                            My Classes
                        </h2>

                        <button
                            onClick={addClass}
                            className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
                        >
                            + Add Class
                        </button>
                    </div>

                    {classes.length === 0 && (
                        <p className="text-gray-500">
                            No classes added yet.
                        </p>
                    )}

                    <div className="space-y-4">
                        {classes.map((course) => (
                            <div
                                key={course.id}
                                className="rounded-lg border p-4"
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Class Name
                                        <input
                                            value={course.name}
                                            onChange={(event) =>
                                                updateClass(
                                                    course.id,
                                                    "name",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="CSC 648"
                                            className="mt-1 w-full rounded-lg border p-3"
                                        />
                                    </label>

                                    <label className="text-sm font-medium text-gray-700">
                                        Days
                                        <input
                                            value={course.days}
                                            onChange={(event) =>
                                                updateClass(
                                                    course.id,
                                                    "days",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Mon, Wed"
                                            className="mt-1 w-full rounded-lg border p-3"
                                        />
                                    </label>

                                    <label className="text-sm font-medium text-gray-700">
                                        Start Time
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
                                            className="mt-1 w-full rounded-lg border p-3"
                                        />
                                    </label>

                                    <label className="text-sm font-medium text-gray-700">
                                        End Time
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
                                            className="mt-1 w-full rounded-lg border p-3"
                                        />
                                    </label>
                                </div>

                                <button
                                    onClick={() => removeClass(course.id)}
                                    className="mt-4 text-sm font-medium text-red-600 hover:text-red-800"
                                >
                                    Remove Class
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={classes.length === 0}
                        className="mt-6 rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        Save My Schedule
                    </button>
                </section>

                {message && (
                    <div
                        role="status"
                        className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800"
                    >
                        {message}
                    </div>
                )}
            </div>
        </main>
    );
}
