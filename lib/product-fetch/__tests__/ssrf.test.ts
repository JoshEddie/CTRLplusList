import { lookup } from 'node:dns/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isPrivateHostname,
  isPrivateIp,
  isUnsafeFetchTarget,
} from '../ssrf';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}));
const lookupMock = vi.mocked(lookup);

describe('isPrivateHostname', () => {
  it.each([
    'localhost',
    'sub.localhost',
    'printer.local',
    'service.internal',
    'intranet',
    '192.168.1.1',
    '[::1]',
    '[::ffff:10.0.0.1]',
    '0:0:0:0:0:ffff:10.0.0.1',
  ])('PrivateShapedHost_ReturnsTrue', (host) => {
    expect(isPrivateHostname(host)).toBe(true);
  });

  it('PublicDottedHostname_ReturnsFalse', () => {
    expect(isPrivateHostname('www.amazon.com')).toBe(false);
  });
});

describe('isPrivateIp', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.0.10',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '192.0.0.170',
    '198.18.0.1',
    '224.0.0.251',
    '255.255.255.255',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '64:ff9b::a00:5',
  ])('PrivateRangeIp_ReturnsTrue', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each([
    '93.184.216.34',
    '172.32.0.1',
    '100.128.0.1',
    '169.253.0.1',
    '192.0.1.1',
    '198.20.0.1',
    '223.255.255.1',
    '2606:2800:220:1::1',
  ])(
    'PublicIp_ReturnsFalse',
    (ip) => {
      expect(isPrivateIp(ip)).toBe(false);
    }
  );

  it('MalformedIp_ReturnsTrue', () => {
    expect(isPrivateIp('999.1.1.1')).toBe(true);
  });
});

describe('isUnsafeFetchTarget', () => {
  beforeEach(() => {
    lookupMock.mockReset();
  });

  it('NonHttpProtocol_ReturnsTrueWithoutDnsLookup', async () => {
    expect(await isUnsafeFetchTarget(new URL('ftp://example.com'))).toBe(true);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('PrivateHostname_ReturnsTrueWithoutDnsLookup', async () => {
    expect(await isUnsafeFetchTarget(new URL('http://localhost:3000'))).toBe(
      true
    );
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('PublicHostnameResolvingPrivate_ReturnsTrue', async () => {
    lookupMock.mockResolvedValue([
      { address: '127.0.0.1', family: 4 },
    ] as never);
    expect(
      await isUnsafeFetchTarget(new URL('https://evil.127.0.0.1.nip.io'))
    ).toBe(true);
  });

  it('PublicHostnameResolvingPublic_ReturnsFalse', async () => {
    lookupMock.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ] as never);
    expect(await isUnsafeFetchTarget(new URL('https://example.com'))).toBe(
      false
    );
  });

  it('DnsFailure_ReturnsTrue', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'));
    expect(
      await isUnsafeFetchTarget(new URL('https://no-such-host.example.com'))
    ).toBe(true);
  });
});
