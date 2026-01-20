import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import AuthButton from "../auth/auth-button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../ui/navigation-menu";
import { TypographyH1, TypographyP } from "../ui/typography";

interface Props {}

export function Navbar({}: Props) {
  const t = useTranslations();

  return (
    <nav className="w-full border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
        <Image
          src="/playground-logo.svg"
          width="30"
          height="30"
          alt="Playground
            Logo"
        />
        <Link href="/" className="mr-8 text-lg font-bold">
          <TypographyH1>{t("common.title")}</TypographyH1>
        </Link>

        {/* Navigation */}
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href="/"
                  className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
                >
                  <TypographyP>{t("header.home")}</TypographyP>
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:grid-cols-2">
                  <li>
                    <NavItem
                      href="/products/analytics"
                      title="Analytics"
                      description="Track user behavior and metrics"
                    />
                  </li>
                  <li>
                    <NavItem
                      href="/products/automation"
                      title="Automation"
                      description="Automate workflows easily"
                    />
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href="/pricing"
                  className="px-4 py-2 text-sm font-medium hover:text-primary"
                >
                  Pricing
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href="/contact"
                  className="px-4 py-2 text-sm font-medium hover:text-primary"
                >
                  Contact
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto">
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block space-y-1 rounded-md p-3 transition-colors hover:bg-muted"
    >
      <div className="text-sm font-medium">{title}</div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
