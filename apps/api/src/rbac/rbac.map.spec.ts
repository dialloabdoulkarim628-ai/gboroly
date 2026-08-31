import { describe, expect, it } from 'vitest';
import { permissionsForRole, RoleKey } from '@gboroly/types';

describe('matrice RBAC (permissionsForRole)', () => {
  it('OWNER a toutes les permissions org sauf admin.platform', () => {
    const perms = permissionsForRole(RoleKey.ORGANIZATION_OWNER);
    expect(perms).toContain('tournament.publish');
    expect(perms).toContain('member.invite');
    expect(perms).toContain('payment.refund');
    expect(perms).not.toContain('admin.platform');
  });

  it('MATCH_OPERATOR est limité à opérer les matchs', () => {
    const perms = permissionsForRole(RoleKey.MATCH_OPERATOR);
    expect(perms).toEqual(expect.arrayContaining(['match.operate', 'standing.view']));
    expect(perms).not.toContain('tournament.publish');
    expect(perms).not.toContain('payment.manage');
  });

  it('FINANCE_MANAGER gère les paiements mais pas les tournois', () => {
    const perms = permissionsForRole(RoleKey.FINANCE_MANAGER);
    expect(perms).toContain('payment.manage');
    expect(perms).not.toContain('tournament.create');
  });

  it('SUPER_ADMIN a admin.platform', () => {
    expect(permissionsForRole(RoleKey.SUPER_ADMIN)).toContain('admin.platform');
  });
});
