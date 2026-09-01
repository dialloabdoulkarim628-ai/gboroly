import { describe, expect, it } from 'vitest';
import { buildWhatsAppLink, matchReminderText, renderNotification } from './templates';

describe('templates de notification', () => {
  it('rend un message de match programmé', () => {
    const m = renderNotification('MATCH_SCHEDULED', {
      home: 'FC Abobo',
      away: 'FC Cocody',
      date: 'Sam 12 sept 15:00',
      field: 'Terrain 2',
    });
    expect(m.subject).toContain('Match programmé');
    expect(m.body).toContain('FC Abobo vs FC Cocody');
    expect(m.body).toContain('Terrain 2');
  });

  it('rend un résultat', () => {
    const m = renderNotification('RESULT_PUBLISHED', {
      home: 'A',
      away: 'B',
      homeScore: 2,
      awayScore: 1,
    });
    expect(m.body).toBe('A 2 - 1 B.');
  });

  it('texte de rappel multi-lignes', () => {
    const txt = matchReminderText({
      home: 'FC Abobo',
      away: 'FC Cocody',
      date: 'Samedi 15h00',
      field: '2',
      url: 'https://gboroly.com/t/x',
    });
    expect(txt).toContain('⚽ Votre prochain match');
    expect(txt).toContain('Terrain : 2');
    expect(txt).toContain('https://gboroly.com/t/x');
  });
});

describe('lien WhatsApp (wa.me)', () => {
  it('normalise le numéro et encode le texte', () => {
    const link = buildWhatsAppLink('+225 07 00 00 00 00', 'Bonjour le monde');
    expect(link).toBe('https://wa.me/2250700000000?text=Bonjour%20le%20monde');
  });

  it('sans numéro → lien de partage générique', () => {
    expect(buildWhatsAppLink(undefined, 'Salut')).toBe('https://wa.me/?text=Salut');
  });
});
