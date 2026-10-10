import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { initialsOf } from './avatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Skeleton } from './skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Textarea } from './textarea';

describe("UI primitive'leri", () => {
  it('Dialog açılır, erişilebilir adı ve i18n kapat butonu vardır, Esc ile kapanır', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Aç</DialogTrigger>
        <DialogContent closeLabel='Kapat'>
          <DialogTitle>Yeni gönderi</DialogTitle>
          <DialogDescription>Açıklama</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole('button', { name: 'Aç' }));
    const dialog = await screen.findByRole('dialog', { name: 'Yeni gönderi' });
    expect(screen.getByRole('button', { name: 'Kapat' })).toHaveClass('size-hit');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it('Tabs klavye ile sekme değiştirir', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue='takip'>
        <TabsList aria-label='Akış sekmeleri'>
          <TabsTrigger value='takip'>Takip</TabsTrigger>
          <TabsTrigger value='son'>Son gönderiler</TabsTrigger>
        </TabsList>
        <TabsContent value='takip'>Takip içeriği</TabsContent>
        <TabsContent value='son'>Son içerik</TabsContent>
      </Tabs>
    );

    expect(screen.getByRole('tab', { name: 'Takip' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Takip' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Son gönderiler' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('Son içerik')).toBeVisible();
  });

  it('DropdownMenu açılır ve öğe seçilir', async () => {
    const user = userEvent.setup();
    const selected: string[] = [];
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Daha fazla</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => selected.push('sil')} variant='danger'>
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    await user.click(screen.getByRole('button', { name: 'Daha fazla' }));
    const item = await screen.findByRole('menuitem', { name: 'Sil' });
    expect(item).toHaveClass('min-h-hit', 'text-danger');
    await user.click(item);
    expect(selected).toEqual(['sil']);
  });

  it('Input ve Textarea kontrol sınırını border-strong ile çizer', () => {
    render(
      <>
        <Input aria-label='Kullanıcı adı' />
        <Textarea aria-label='Gönderi' />
      </>
    );
    expect(screen.getByRole('textbox', { name: 'Kullanıcı adı' })).toHaveClass(
      'border-border-strong',
      'min-h-hit'
    );
    expect(screen.getByRole('textbox', { name: 'Gönderi' })).toHaveClass('border-border-strong');
  });

  it('Skeleton dekoratiftir (ekran okuyucudan gizli)', () => {
    const { container } = render(<Skeleton className='h-4 w-20' />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('initialsOf Türkçe büyük harf kuralını uygular', () => {
    expect(initialsOf('ilker şahin')).toBe('İŞ');
    expect(initialsOf('  ayşe  ')).toBe('A');
    expect(initialsOf('ıhlamur ağacı yolu')).toBe('IA');
  });
});
