const days = [
    "minggu",
    "senin",
    "selasa",
    "rabu",
    "kamis",
    "jumat",
    "sabtu"
];

export function getCurrentDay(): string {
    const dayIndex = new Date().getDay();

    return days[dayIndex];
}