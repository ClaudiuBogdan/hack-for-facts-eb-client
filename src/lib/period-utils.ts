import {
    ReportPeriodInput,
    PeriodDate,
    YEAR_MONTH_PERIOD,
    YEAR_PERIOD,
    YEAR_QUARTER_PERIOD,
} from "@/schemas/reporting";

export type PeriodTag = {
    key: string;
    label: string;
    value: PeriodDate | string;
    isInterval?: boolean;
};

export function getPeriodTags(period: ReportPeriodInput | undefined): PeriodTag[] {
    if (!period) return [];

    if (period.selection.dates && period.selection.dates.length > 0) {
        return period.selection.dates.map(date => ({
            key: `period_date_${date}`,
            label: period.type,
            value: date,
        }));
    }

    if (period.selection.interval) {
        const { start, end } = period.selection.interval;
        if (!start || !end) return [];
        const value = start === end ? String(start) : `${start} - ${end}`;
        return [{
            key: 'period_interval',
            label: period.type,
            value: value,
            isInterval: true,
        }];
    }
    return [];
}

function getDaysInMonth(month: number, year: number): string {
    return String(new Date(year, month, 0).getDate()).padStart(2, "0");
}

export function toReportDateBoundary(anchor: PeriodDate | string, isStart = true): string {
    if (!anchor) return "";

    if (YEAR_PERIOD.test(anchor)) {
        return isStart ? `${anchor}-01-01` : `${anchor}-12-31`;
    }

    if (YEAR_MONTH_PERIOD.test(anchor)) {
        const [year, month] = anchor.split("-");
        return isStart
            ? `${year}-${month}-01`
            : `${year}-${month}-${getDaysInMonth(Number(month), Number(year))}`;
    }

    if (YEAR_QUARTER_PERIOD.test(anchor)) {
        const year = Number(anchor.slice(0, 4));
        const quarter = anchor.slice(5);
        const quarterStartMonth =
            quarter === "Q1"
                ? "01"
                : quarter === "Q2"
                    ? "04"
                    : quarter === "Q3"
                        ? "07"
                        : "10";
        const quarterEndMonth =
            quarter === "Q1"
                ? "03"
                : quarter === "Q2"
                    ? "06"
                    : quarter === "Q3"
                        ? "09"
                        : "12";

        return isStart
            ? `${year}-${quarterStartMonth}-01`
            : `${year}-${quarterEndMonth}-${getDaysInMonth(Number(quarterEndMonth), year)}`;
    }

    return anchor;
}

export function getReportDateRange(period: ReportPeriodInput): {
    start: string;
    end: string;
} {
    const selection = period.selection;

    if ("interval" in selection && selection.interval) {
        const { start, end } = selection.interval;

        return {
            start: toReportDateBoundary(start, true),
            end: toReportDateBoundary(end, false),
        };
    }

    const selectedDates = [...(selection.dates ?? [])].sort();
    const earliestDate = selectedDates[0] ?? "";
    const latestDate = selectedDates[selectedDates.length - 1] ?? "";

    return {
        start: toReportDateBoundary(earliestDate, true),
        end: toReportDateBoundary(latestDate, false),
    };
}
