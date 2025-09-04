import { parseISO } from 'date-fns';
export const getParsedTimestamp = (timeStr) => {
    // Convert input format to ISO format and parse as UTC
    const isoString = timeStr.replace(' ', 'T') + 'Z';
    const parsedDate = parseISO(isoString);
    if (isNaN(parsedDate.getTime())) {
        throw new Error(`Could not parse time string: ${timeStr}`);
    }
    return Math.floor(parsedDate.getTime());
};
export const getCurrentTimestamp = () => {
    return Math.floor(Date.now());
};
export const getEndOfDayTimestamp = () => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return Math.floor(endOfDay.getTime());
};
