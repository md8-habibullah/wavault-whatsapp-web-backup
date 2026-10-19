import { describe, expect, it } from 'vitest';
import { buildContacts, groupMembers, indexContacts } from '../src/lib/model.js';
import { applyFilter, emptyFilter, presetCounts, presetState, filterChats } from '../src/lib/filters.js';
import { snapshot } from './fixtures.js';

const contacts = buildContacts(snapshot);
const byPhone = (p) => contacts.find((c) => c.phone === p);

describe('buildContacts', () => {
  it('merges phone and LID records of the same person', () => {
    expect(contacts.filter((c) => c.phone === '8801711111111')).toHaveLength(1);
    const rahim = byPhone('8801711111111');
    expect(rahim.lid).toBe('911111111111111');
    expect(rahim.pushname).toBe('Rahim 🌳');
    expect(rahim.username).toBe('rahim.tree');
    expect(rahim.labels).toEqual(['New customer']);
  });

  it('keeps an address-book duplicate marked as on WhatsApp', () => {
    expect(byPhone('8801711111111').onWhatsApp).toBe(true);
    expect(byPhone('8801812345678').onWhatsApp).toBe(false);
    expect(byPhone('8801812345678').isSaved).toBe(true);
  });

  it('adds chat and group info', () => {
    const rahim = byPhone('8801711111111');
    expect(rahim.hasChat).toBe(true);
    expect(rahim.unreadCount).toBe(3);
    expect(rahim.pinned).toBe(true);
    expect(rahim.groups).toEqual(['Tree Crew']);
    expect(byPhone('447700900123').labels).toEqual(['New customer']);
  });

  it('keeps hidden-number group members as LID-only contacts', () => {
    const hidden = contacts.find((c) => c.key === 'lid:933333333333333');
    expect(hidden).toBeTruthy();
    expect(hidden.phone).toBeNull();
    expect(hidden.adminIn).toEqual(['Tree Crew']);
    expect(hidden.displayName).toBe('LID 933333333333333');
  });

  it('marks blocked contacts, business accounts and me', () => {
    expect(byPhone('8801999999999').isBlocked).toBe(true);
    expect(byPhone('15551234567').isBusiness).toBe(true);
    expect(byPhone('15551234567').businessName).toBe('Acme Tree Care');
    expect(byPhone('8801700000000').isMe).toBe(true);
  });

  it('has 7 unique people (6 excluding me)', () => {
    expect(contacts).toHaveLength(7);
  });

  it('resolves group members through LID mapping', () => {
    const members = groupMembers(snapshot.groups[0], indexContacts(contacts));
    expect(members.map((m) => m.role)).toEqual(['Member', 'Admin', 'Owner', 'Member']);
    expect(members[0].displayName).toBe('রহিম উদ্দিন');
    expect(members[0].phone).toBe('8801711111111');
    expect(members[1].phone).toBeNull();
  });
});

describe('filters', () => {
  const run = (preset, extra = {}) => applyFilter(contacts, { ...emptyFilter(), facets: presetState(preset), ...extra }).map((c) => c.phone || c.key);

  it('covers every preset', () => {
    expect(run('all')).toHaveLength(6);
    expect(run('saved').sort()).toEqual(['15551234567', '8801711111111', '8801812345678', '8801999999999'].sort());
    expect(run('unsaved').sort()).toEqual(['447700900123', 'lid:933333333333333'].sort());
    expect(run('invite')).toEqual(['8801812345678']);
    expect(run('chatted').sort()).toEqual(['447700900123', '8801711111111'].sort());
    expect(run('unread')).toEqual(['8801711111111']);
    expect(run('read')).toEqual(['447700900123']);
    expect(run('withUsername')).toEqual(['8801711111111']);
    expect(run('withoutUsername')).not.toContain('8801711111111');
    expect(run('withoutUsername')).not.toContain('8801812345678');
    expect(run('business')).toEqual(['15551234567']);
    expect(run('groupMembers').sort()).toEqual(['15551234567', '8801711111111', 'lid:933333333333333'].sort());
    expect(run('hiddenNumber')).toEqual(['lid:933333333333333']);
    expect(run('blocked')).toEqual(['8801999999999']);
  });

  it('searches names in any script, usernames, and numbers in any format', () => {
    expect(run('all', { search: 'রহিম' })).toEqual(['8801711111111']);
    expect(run('all', { search: '@rahim' })).toEqual(['8801711111111']);
    expect(run('all', { search: '+44 7700' })).toEqual(['447700900123']);
    expect(run('all', { search: 'acme tree' })).toEqual(['15551234567']);
    expect(run('all', { search: 'nobody' })).toEqual([]);
  });

  it('filters by group and label', () => {
    expect(run('all', { groups: ['Tree Crew'] })).toHaveLength(3);
    expect(run('all', { labels: ['Paid'] })).toEqual(['15551234567']);
  });

  it('counts presets without me', () => {
    const counts = presetCounts(contacts);
    expect(counts.all).toBe(6);
    expect(counts.invite).toBe(1);
  });

  it('filters chats', () => {
    expect(filterChats(snapshot.chats, 'unread', '').map((c) => c.title)).toEqual(['রহিম উদ্দিন', 'Tree Crew']);
    expect(filterChats(snapshot.chats, 'group', '').map((c) => c.title)).toEqual(['Tree Crew']);
    expect(filterChats(snapshot.chats, 'archived', '').map((c) => c.title)).toEqual(['Stranger']);
    expect(filterChats(snapshot.chats, 'all', '4477').map((c) => c.title)).toEqual(['Stranger']);
    expect(filterChats(snapshot.chats, 'all', '', ['1']).map((c) => c.title)).toEqual(['Stranger']);
  });
});
