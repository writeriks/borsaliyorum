'use client';

import { useLocale } from 'next-intl';
import type { ComponentPropsWithoutRef, MouseEvent, ReactElement } from 'react';

import { getPathname, useRouter } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';
import { markInAppNavigation } from '@/lib/client/in-app-navigation';
import { cn } from '@/lib/utils';

/**
 * Tıklaması kartın kendisine ait sayılmayan öğeler: linkler (entity, yazar, zaman), butonlar
 * (beğeni, menü, "Devamını gör"), form alanları ve açıkça işaretlenenler.
 */
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[contenteditable="true"]',
  '[data-card-click="ignore"]',
].join(',');

/**
 * Kart tıklaması detaya gitmeli mi (saf; unit testli)? Hayır: hedef kartın DOM'unda değilse
 * (Radix portalındaki menü/diyalog React ağacında kabarcıklanır ama DOM'da dışarıdadır), hedef
 * ya da bir atası kartın içindeki etkileşimli bir öğeyse ya da kullanıcı metin seçmişse.
 */
export const shouldOpenFromCardClick = (
  target: EventTarget | null,
  card: Element,
  selectedText: string
): boolean => {
  if (!(target instanceof Element) || !card.contains(target)) return false;
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  if (interactive !== null && card.contains(interactive)) return false;
  return selectedText.trim() === '';
};

type PostCardSurfaceProps = ComponentPropsWithoutRef<'article'> & {
  /** Detay yolu (yerel öneki olmadan, ör. `/gonderi/1`). Yoksa kart tıklanmaz (detay sayfası). */
  href?: string;
};

const toLocale = (value: string): Locale =>
  (routing.locales as readonly string[]).includes(value)
    ? (value as Locale)
    : routing.defaultLocale;

/**
 * Kartın `<article>` kabuğu (tasarım §7.4: "Kartın tamamı tıklanabilir"). Yalnızca fare/dokunma
 * kolaylığıdır: klavye ve ekran okuyucu için detay linki zaman öğesidir (görünmez overlay link
 * yok; iç linkler kendi hedeflerine gider, [ENT-R05]). Ctrl/Cmd/Shift ya da orta tık yeni sekme.
 */
export const PostCardSurface = ({
  href,
  className,
  children,
  ...props
}: PostCardSurfaceProps): ReactElement => {
  const router = useRouter();
  const locale = toLocale(useLocale());

  if (href === undefined) {
    return (
      <article className={className} {...props}>
        {children}
      </article>
    );
  }

  const open = (event: MouseEvent<HTMLElement>, newTab: boolean): void => {
    const selected = window.getSelection()?.toString() ?? '';
    if (!shouldOpenFromCardClick(event.target, event.currentTarget, selected)) return;
    if (newTab) {
      window.open(getPathname({ href, locale }), '_blank', 'noopener');
      return;
    }
    router.push(href);
  };

  return (
    <article
      {...props}
      data-clickable='true'
      className={cn(
        'cursor-pointer transition-colors duration-(--duration-fast) hover:bg-bg-subtle',
        className
      )}
      onClick={event => {
        // Zaman linkiyle (klavye yolu) detaya gidişte de "Geri" akışa dönebilsin
        markInAppNavigation();
        if (event.defaultPrevented || event.button !== 0) return;
        open(event, event.metaKey || event.ctrlKey || event.shiftKey);
      }}
      onAuxClick={event => {
        if (event.defaultPrevented || event.button !== 1) return;
        open(event, true);
      }}
    >
      {children}
    </article>
  );
};
