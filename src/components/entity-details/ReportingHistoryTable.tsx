import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ReportingHistoryTableProps {
    cui: string;
}

export function ReportingHistoryTable({ cui }: ReportingHistoryTableProps) {
    // TODO: Fetch reporting history for the CUI from 'Reports' table
    // Columns: report_date, reporting_year, reporting_period, file_source, import_timestamp

    // Placeholder data
    const reports = [
        { id: 1, date: '2023-10-01', year: 2023, period: 'Q3', source: 'upload1.pdf', imported: '2023-10-02 10:00' },
        { id: 2, date: '2023-07-01', year: 2023, period: 'Q2', source: 'upload2.xlsx', imported: '2023-07-03 11:00' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Istoric Raportări</CardTitle>
            </CardHeader>
            <CardContent>
                <p>CUI: {cui}</p>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Dată Raport</TableHead>
                            <TableHead>An Raportare</TableHead>
                            <TableHead>Perioadă</TableHead>
                            <TableHead>Sursă Fișier</TableHead>
                            <TableHead>Dată Import</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.map((report) => (
                            <TableRow key={report.id}>
                                <TableCell>{report.date}</TableCell>
                                <TableCell>{report.year}</TableCell>
                                <TableCell>{report.period}</TableCell>
                                <TableCell>{report.source}</TableCell>
                                <TableCell>{report.imported}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 <p className="text-sm text-muted-foreground mt-2">
                    Tabel Istoric Raportări în construcție (date exemplu).
                </p>
            </CardContent>
        </Card>
    );
} 