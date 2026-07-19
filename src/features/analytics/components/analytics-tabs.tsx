import type { JlptLevel } from "@prisma/client";
import { JlptScoreTable } from "@/components/jlpt-score-table";
import type { JlptScoreProjection } from "@/lib/jlpt-score";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AnalyticsTabs({
  levelStats,
}: {
  levelStats: { level: JlptLevel; projection: JlptScoreProjection }[];
}) {
  return (
    <Tabs defaultValue={levelStats[0].level}>
      <TabsList>
        {levelStats.map(({ level }) => (
          <TabsTrigger key={level} value={level}>
            {level}
          </TabsTrigger>
        ))}
      </TabsList>
      {levelStats.map(({ level, projection }) => (
        <TabsContent key={level} value={level}>
          <Card>
            <CardHeader>
              <CardTitle>{level}</CardTitle>
              <CardDescription>
                Akurasi per mondai (agregat attempt sesuai filter) + proyeksi skor ala JLPT:
                skala 60 per scoring section, total 180. Kolom Skor Berbobot memakai bobot
                kesulitan per mondai (aproksimasi, bukan algoritma resmi JLPT).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JlptScoreTable projection={projection} />
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
