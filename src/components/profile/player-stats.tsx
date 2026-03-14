import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { TypographyP } from "@/components/ui/typography";

interface PlayerStatsProps {
  player: {
    age: number | null;
    height: number | null;
    weight: number | null;
  };
}

export async function PlayerStats({ player }: PlayerStatsProps) {
  const t = await getTranslations("profile.stats");

  const hasAnyStats =
    player.age != null || player.height != null || player.weight != null;

  if (!hasAnyStats) {
    return null;
  }

  const formatHeight = (cm: number): string => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  const formatWeight = (kg: number): string => {
    return `${Math.round(kg)} kg`;
  };

  return (
    <section className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {player.age != null && (
              <StatItem
                label={t("age")}
                value={`${player.age} ${t("years")}`}
              />
            )}
            {player.height != null && (
              <StatItem
                label={t("height")}
                value={formatHeight(player.height)}
              />
            )}
            {player.weight != null && (
              <StatItem
                label={t("weight")}
                value={formatWeight(player.weight)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <TypographyP className="text-sm text-muted-foreground">
        {label}
      </TypographyP>
      <TypographyP className="text-2xl font-semibold">{value}</TypographyP>
    </div>
  );
}
