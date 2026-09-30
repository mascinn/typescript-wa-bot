export function timeToDate(time: string): Date{

    const [hour, minute] = time.split(":").map(Number)

    const date = new Date();

    date.setHours(hour, minute, 0, 0);

    return date;
}

export function subtractMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() - minutes * 60 * 1000);
}