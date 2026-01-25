import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { TypographyP } from "../ui/typography";

interface PlayerStatsProps {
  player: {
    age?: number | null;
    height?: number | null;
    weight?: number | null;
  };
}

export async function PlayerStats({ player }: PlayerStatsProps) {
  const t = await getTranslations("profile.stats");

  const hasAnyStats = player.age || player.height || player.weight;

  if (!hasAnyStats) {
    return null;
  }

  // Format height (assuming cm, convert to feet/inches for display)
  const formatHeight = (cm: number | null | undefined): string | null => {
    if (!cm) return null;
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  // Format weight (assuming kg)
  const formatWeight = (kg: number | null | undefined): string | null => {
    if (!kg) return null;
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
            {player.age && (
              <StatItem
                label={t("age")}
                value={`${player.age} ${t("years")}`}
              />
            )}
            {player.height && (
              <StatItem
                label={t("height")}
                value={formatHeight(player.height)!}
              />
            )}
            {player.weight && (
              <StatItem
                label={t("weight")}
                value={formatWeight(player.weight)!}
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
