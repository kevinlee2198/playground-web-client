"use client";

import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { useTranslator } from "../i18n/locale-provider";
import { TypographyP } from "../ui/typography";

interface Props {}

export default function AuthButton(props: Props) {
  const t = useTranslator();
  const session = useSession();

  const handleSignIn = async () => {
    await signIn.oauth2({
      providerId: "keycloak",
      callbackURL: window.location.href,
    });
  };

  const handleSignUp = async () => {
    // Keycloak handles registration through the same OAuth flow
    // Users can click "Register" on the Keycloak login page
    await signIn.oauth2({
      providerId: "keycloak",
      callbackURL: window.location.href,
    });
  };

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.reload();
        },
      },
    });
  };

  if (session.isPending) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-20 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (session?.data?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {session.data.user.email || session.data.user.name}
        </span>
        <Button variant="outline" onClick={handleSignOut}>
          <TypographyP>{t("auth.signOut")}</TypographyP>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={handleSignUp}>
        <TypographyP>{t("auth.signUp")}</TypographyP>
      </Button>
      <Button onClick={handleSignIn}>
        <TypographyP>{t("auth.signIn")}</TypographyP>
      </Button>
    </div>
  );
}
