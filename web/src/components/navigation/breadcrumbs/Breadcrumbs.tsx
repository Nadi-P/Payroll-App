import { Icon } from "@/components/typography/icon/Icon";
import { Link } from "@/i18n/navigation";
import { breadcrumbsStyles as s } from "./breadcrumbs.styles";

interface BreadcrumbsProps {
  items: { label: string; href?: string }[];
  ariaLabel: string;
}

export function Breadcrumbs({ items, ariaLabel }: BreadcrumbsProps) {
  return (
    <nav aria-label={ariaLabel}>
      <ol className={s.list}>
        {items.map((item, i) => (
          <li key={`${i}-${item.label}`} className={s.item}>
            {i > 0 ? (
              <span className={s.separator}>
                <Icon name="chevron-forward" size="xs" />
              </span>
            ) : null}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} direction="back" className={s.link}>
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className={s.current}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
