// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ResultsApp, { renderCell } from './ResultsApp';
import type { Participant, ResultsPayload } from './types';

const participant: Participant = {
  id: 5078682,
  name: 'IKA ARISTA',
  bib: 'MH2001',
  sex: 'F',
  genderLabel: 'Female',
  itemName: '10K',
  ageGroup: 'MAHASISWA',
  ageGroup2: 'UMUM',
  finisher: 1,
  status: { label: 'Finisher', tone: 'finisher' },
  netScore: '00:46:04',
  totalScore: '00:47:38',
  startTime: '00:01:34',
  finishTime: '2026-07-19 06:03:38',
  pace: '4:36',
  city: 'Semarang',
  team: 'Tim A',
  diff: '+00:14:56',
  cp1: '00:10:00',
  cp2: '00:20:00',
  cp1Cp2: '00:10:00',
  netRanking: 10,
  itemNetRank: 44,
  ageNetRank: 2,
  age2NetRank: 7
};

function payload(overrides: Partial<ResultsPayload['config']> = {}): ResultsPayload {
  return {
    mode: 'results',
    slug: 'demo',
    dataUrl: 'data.json',
    assetBase: './',
    config: {
      slug: 'demo',
      title: 'Demo Run',
      banner: null,
      ...overrides
    }
  };
}

describe('renderCell', () => {
  it('renders text cells', () => {
    expect(renderCell(participant, 'item')).toBe('10K');
    expect(renderCell(participant, 'bib')).toBe('MH2001');
    expect(renderCell(participant, 'ageGroup')).toBe('MAHASISWA');
    expect(renderCell(participant, 'gunTime')).toBe('00:47:38');
    expect(renderCell(participant, 'netTime')).toBe('00:46:04');
    expect(renderCell(participant, 'overallRank')).toBe('44');
    expect(renderCell(participant, 'genderRank')).toBe('10');
    expect(renderCell(participant, 'ageRank')).toBe('2');
    expect(renderCell(participant, 'age2Rank')).toBe('7');
  });

  it('links name and certificate to the timing provider', () => {
    const name = renderToStaticMarkup(<>{renderCell(participant, 'name')}</>);
    const cert = renderToStaticMarkup(<>{renderCell(participant, 'cert')}</>);

    expect(name).toContain('https://time.feibot.com/live-wire/scores/detail/5078682');
    expect(cert).toContain('fa-certificate');
  });

  it('renders the gender and status badges', () => {
    const gender = renderToStaticMarkup(<>{renderCell(participant, 'gender')}</>);
    const status = renderToStaticMarkup(<>{renderCell(participant, 'status')}</>);

    expect(gender).toContain('Female');
    expect(gender).toContain('fa-venus');
    expect(status).toContain('Finisher');
    expect(status).toContain('status-badge finisher');
  });

  it('renders the missing-value placeholders', () => {
    const empty: Participant = { ...participant, ageGroup: '', ageGroup2: '', itemNetRank: null };

    expect(renderCell(empty, 'ageGroup')).toBe('-');
    expect(renderCell(empty, 'ageGroup2')).toBe('-');
    expect(renderCell(empty, 'overallRank')).toBe('-');
  });
});

describe('ResultsApp', () => {
  it('renders the maintenance notice without loading data', () => {
    const html = renderToStaticMarkup(<ResultsApp payload={payload({ maintenance: true })} />);

    expect(html).toContain('Demo Run');
    expect(html).toContain('Data hasil masih dalam proses pembaruan');
    expect(html).not.toContain('participantsTable');
  });

  it('accepts a custom maintenance message', () => {
    const html = renderToStaticMarkup(
      <ResultsApp payload={payload({ maintenance: true, maintenanceMessage: 'Segera hadir' })} />
    );

    expect(html).toContain('Segera hadir');
  });

  it('renders the loading state before the data arrives', () => {
    const html = renderToStaticMarkup(<ResultsApp payload={payload()} />);

    expect(html).toContain('Memuat hasil...');
    expect(html).toContain('hero-badge');
  });

  it('skips the banner when the event has none', () => {
    const html = renderToStaticMarkup(<ResultsApp payload={payload()} />);

    expect(html).not.toContain('class="banner"');
  });
});
