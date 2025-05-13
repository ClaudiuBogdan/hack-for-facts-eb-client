import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EntityProfileCardProps {
    cui: string;
    // TODO: Add other relevant props based on data model from spec (Entities, UATs)
}

export function EntityProfileCard({ cui }: EntityProfileCardProps) {
    // TODO: Fetch entity profile data using cui
    // Data points: Entities.name, Entities.cui, Entities.sector_type, UATs.name, UATs.county_name, UATs.population

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profil Entitate</CardTitle>
                {/* Potentially display CUI or other key ID here */}
            </CardHeader>
            <CardContent>
                <p>Nume Entitate: {/* Placeholder for Entities.name */} </p>
                <p>CUI: {cui}</p>
                <p>Tip Sector: {/* Placeholder for Entities.sector_type */} </p>
                <p>UAT: {/* Placeholder for UATs.name */} </p>
                <p>Județ: {/* Placeholder for UATs.county_name */} </p>
                <p>Populație UAT: {/* Placeholder for UATs.population */} </p>
                <p className="text-sm text-muted-foreground mt-2">
                    Secțiune Profil Entitate în construcție.
                </p>
            </CardContent>
        </Card>
    );
} 