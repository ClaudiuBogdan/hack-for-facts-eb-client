import type { StatisticsHubSeriesPoint } from '@/schemas/statistics'

/**
 * National annual histories for the hub's charts, captured from INS Tempo
 * through the Chronos API on 2026-09-22 and kept in the client.
 *
 * Why static: these are closed years of official statistics — INS revises
 * them rarely and never silently — and reading 35 years of eight datasets on
 * every page view is a cost with no information in it. The hub reads the
 * *latest* value live and appends it when it is newer than the last point
 * here, so the charts stay current at the edge without the history being
 * re-fetched.
 *
 * Each block is the total cell of its dataset at RO/NATIONAL, annual cadence,
 * the same cell `insLatestDatasetValues` resolves with `TOTAL_FALLBACK`.
 * To refresh one, read every annual observation of that cell —
 * `insObservations(datasetCode, filter: {territoryCodes: ["RO"],
 * territoryLevels: [NATIONAL], unitCodes: [unitCode], sourcePins: pins})`,
 * `sourcePins` being the `pins` below as `{dimensionIndex, memberCode}` —
 * and replace the whole block. Take the dataset's own range as the answer:
 * the first capture stopped SOM101F at 2016 and TUR104E at 2003 although
 * INS publishes both from 2010 and 2001, which cost the hub two sparklines'
 * worth of history and mis-stated tourism's growth base.
 * `HUB_SERIES_CAPTURED_AT` records when the read was taken, and the hub
 * shows that month beside the charts.
 */
export const HUB_SERIES_CAPTURED_AT = '2026-09-22'

export interface HubStaticSeries {
  readonly code: string
  /** The unit the values are in; a live point in another unit is not appended. */
  readonly unitCode: string
  /** `Dn:member` of the total cell the values belong to. */
  readonly pins: readonly string[]
  readonly points: readonly StatisticsHubSeriesPoint[]
}

const FOM104D_RO: HubStaticSeries = {
  code: 'FOM104D',
  unitCode: '9685',
  pins: ['D0:112', 'D1:112'],
  points: [
    { period: '1990', value: 8155605 },
    { period: '1991', value: 7573777 },
    { period: '1992', value: 6887525 },
    { period: '1993', value: 6671686 },
    { period: '1994', value: 6438370 },
    { period: '1995', value: 6173400 },
    { period: '1996', value: 5938652 },
    { period: '1997', value: 5597025 },
    { period: '1998', value: 5368673 },
    { period: '1999', value: 4760525 },
    { period: '2000', value: 4623026 },
    { period: '2001', value: 4618988 },
    { period: '2002', value: 4567820 },
    { period: '2003', value: 4590876 },
    { period: '2004', value: 4468837 },
    { period: '2005', value: 4558910 },
    { period: '2006', value: 4667254 },
    { period: '2007', value: 4885319 },
    { period: '2008', value: 5046317 },
    { period: '2009', value: 4774263 },
    { period: '2010', value: 4376044 },
    { period: '2011', value: 4348739 },
    { period: '2012', value: 4442865 },
    { period: '2013', value: 4443554 },
    { period: '2014', value: 4507729 },
    { period: '2015', value: 4611395 },
    { period: '2016', value: 4759419 },
    { period: '2017', value: 4945868 },
    { period: '2018', value: 5068063 },
    { period: '2019', value: 5164471 },
    { period: '2020', value: 5031767 },
    { period: '2021', value: 5094288 },
    { period: '2022', value: 5209493 },
    { period: '2023', value: 5364938 },
    { period: '2024', value: 5453155 },
  ],
}

// INS carries the total from 1990 but the ownership split only from 1993, and
// the total steps down 8.01M → 7.66M between 1990 and 1991 — a source break the
// notes do not explain. Kept: the line is what INS publishes.
const LOC101B_RO: HubStaticSeries = {
  code: 'LOC101B',
  unitCode: '9669',
  pins: ['D0:7388', 'D1:112', 'D2:112'],
  points: [
    { period: '1990', value: 8006349 },
    { period: '1991', value: 7659003 },
    { period: '1992', value: 7682359 },
    { period: '1993', value: 7710081 },
    { period: '1994', value: 7748667 },
    { period: '1995', value: 7782095 },
    { period: '1996', value: 7810624 },
    { period: '1997', value: 7836860 },
    { period: '1998', value: 7859919 },
    { period: '1999', value: 7884890 },
    { period: '2000', value: 7907520 },
    { period: '2001', value: 8107114 },
    { period: '2002', value: 8128914 },
    { period: '2003', value: 8152375 },
    { period: '2004', value: 8176487 },
    { period: '2005', value: 8201508 },
    { period: '2006', value: 8231295 },
    { period: '2007', value: 8270549 },
    { period: '2008', value: 8328663 },
    { period: '2009', value: 8384972 },
    { period: '2010', value: 8427941 },
    { period: '2011', value: 8722398 },
    { period: '2012', value: 8760923 },
    { period: '2013', value: 8799832 },
    { period: '2014', value: 8840595 },
    { period: '2015', value: 8882090 },
    { period: '2016', value: 8929167 },
    { period: '2017', value: 8976794 },
    { period: '2018', value: 9031317 },
    { period: '2019', value: 9092963 },
    { period: '2020', value: 9156311 },
    { period: '2021', value: 9930134 },
    { period: '2022', value: 9998666 },
    { period: '2023', value: 10065204 },
    { period: '2024', value: 10122333 },
    { period: '2025', value: 10177161 },
  ],
}

const POP107D_RO: HubStaticSeries = {
  code: 'POP107D',
  unitCode: '9685',
  pins: ['D0:1', 'D1:105', 'D2:112', 'D3:112'],
  points: [
    { period: '1992', value: 23143860 },
    { period: '1993', value: 23118745 },
    { period: '1994', value: 23093262 },
    { period: '1995', value: 23062448 },
    { period: '1996', value: 23009075 },
    { period: '1997', value: 22938405 },
    { period: '1998', value: 22885802 },
    { period: '1999', value: 22852905 },
    { period: '2000', value: 22825288 },
    { period: '2001', value: 22809546 },
    { period: '2002', value: 22779441 },
    { period: '2003', value: 22733751 },
    { period: '2004', value: 22688392 },
    { period: '2005', value: 22648514 },
    { period: '2006', value: 22614980 },
    { period: '2007', value: 22582773 },
    { period: '2008', value: 22561686 },
    { period: '2009', value: 22541941 },
    { period: '2010', value: 22516004 },
    { period: '2011', value: 22480599 },
    { period: '2012', value: 22433741 },
    { period: '2013', value: 22390978 },
    { period: '2014', value: 22346178 },
    { period: '2015', value: 22312887 },
    { period: '2016', value: 22273309 },
    { period: '2017', value: 22236154 },
    { period: '2018', value: 22221895 },
    { period: '2019', value: 22215217 },
    { period: '2020', value: 22211708 },
    { period: '2021', value: 22138604 },
    { period: '2022', value: 22028486 },
    { period: '2023', value: 21953617 },
    { period: '2024', value: 21849217 },
    { period: '2025', value: 21751865 },
    { period: '2026', value: 21646220 },
  ],
}

const POP201D_RO: HubStaticSeries = {
  code: 'POP201D',
  unitCode: '9685',
  pins: ['D0:112', 'D1:112'],
  points: [
    { period: '1990', value: 314746 },
    { period: '1991', value: 275275 },
    { period: '1992', value: 260393 },
    { period: '1993', value: 249994 },
    { period: '1994', value: 246736 },
    { period: '1995', value: 236640 },
    { period: '1996', value: 231348 },
    { period: '1997', value: 236891 },
    { period: '1998', value: 237297 },
    { period: '1999', value: 234600 },
    { period: '2000', value: 234521 },
    { period: '2001', value: 220368 },
    { period: '2002', value: 210529 },
    { period: '2003', value: 212459 },
    { period: '2004', value: 216261 },
    { period: '2005', value: 221020 },
    { period: '2006', value: 219483 },
    { period: '2007', value: 214728 },
    { period: '2008', value: 221900 },
    { period: '2009', value: 222388 },
    { period: '2010', value: 212199 },
    { period: '2011', value: 196242 },
    { period: '2012', value: 201104 },
    { period: '2013', value: 214932 },
    { period: '2014', value: 202501 },
    { period: '2015', value: 206190 },
    { period: '2016', value: 209641 },
    { period: '2017', value: 214928 },
    { period: '2018', value: 214614 },
    { period: '2019', value: 215467 },
    { period: '2020', value: 211273 },
    { period: '2021', value: 203418 },
    { period: '2022', value: 188322 },
    { period: '2023', value: 164004 },
    { period: '2024', value: 157270 },
    { period: '2025', value: 145725 },
  ],
}

const POP206D_RO: HubStaticSeries = {
  code: 'POP206D',
  unitCode: '9685',
  pins: ['D0:112', 'D1:112'],
  points: [
    { period: '1990', value: 247086 },
    { period: '1991', value: 251760 },
    { period: '1992', value: 263855 },
    { period: '1993', value: 263323 },
    { period: '1994', value: 266101 },
    { period: '1995', value: 271672 },
    { period: '1996', value: 286158 },
    { period: '1997', value: 279315 },
    { period: '1998', value: 269166 },
    { period: '1999', value: 265194 },
    { period: '2000', value: 255820 },
    { period: '2001', value: 259603 },
    { period: '2002', value: 269666 },
    { period: '2003', value: 266575 },
    { period: '2004', value: 258890 },
    { period: '2005', value: 262101 },
    { period: '2006', value: 258094 },
    { period: '2007', value: 251965 },
    { period: '2008', value: 253202 },
    { period: '2009', value: 257213 },
    { period: '2010', value: 259723 },
    { period: '2011', value: 251439 },
    { period: '2012', value: 255539 },
    { period: '2013', value: 250466 },
    { period: '2014', value: 255604 },
    { period: '2015', value: 262981 },
    { period: '2016', value: 258896 },
    { period: '2017', value: 262811 },
    { period: '2018', value: 265494 },
    { period: '2019', value: 261445 },
    { period: '2020', value: 300114 },
    { period: '2021', value: 336678 },
    { period: '2022', value: 273980 },
    { period: '2023', value: 244624 },
    { period: '2024', value: 245698 },
    { period: '2025', value: 239691 },
  ],
}

const POP217A_RO: HubStaticSeries = {
  code: 'POP217A',
  unitCode: '9361',
  pins: ['D0:108', 'D1:105', 'D2:112'],
  points: [
    { period: '1990', value: 69.56 },
    { period: '1991', value: 69.76 },
    { period: '1992', value: 69.78 },
    { period: '1993', value: 69.52 },
    { period: '1994', value: 69.48 },
    { period: '1995', value: 69.4 },
    { period: '1996', value: 69.05 },
    { period: '1997', value: 68.95 },
    { period: '1998', value: 69.24 },
    { period: '1999', value: 69.74 },
    { period: '2000', value: 70.53 },
    { period: '2001', value: 71.19 },
    { period: '2002', value: 71.18 },
    { period: '2003', value: 71.01 },
    { period: '2004', value: 71.32 },
    { period: '2005', value: 71.76 },
    { period: '2006', value: 72.22 },
    { period: '2007', value: 72.61 },
    { period: '2008', value: 73.47 },
    { period: '2009', value: 73.76 },
    { period: '2010', value: 73.9 },
    { period: '2011', value: 74.2 },
    { period: '2012', value: 74.69 },
    { period: '2013', value: 75.15 },
    { period: '2014', value: 75.41 },
    { period: '2015', value: 75.35 },
    { period: '2016', value: 75.5 },
    { period: '2017', value: 75.68 },
    { period: '2018', value: 75.8 },
    { period: '2019', value: 75.92 },
    { period: '2020', value: 76 },
    { period: '2021', value: 75.87 },
    { period: '2022', value: 74.26 },
    { period: '2023', value: 75.52 },
    { period: '2024', value: 77.07 },
    { period: '2025', value: 77.45 },
  ],
}

const TUR104E_RO: HubStaticSeries = {
  code: 'TUR104E',
  unitCode: '9685',
  pins: ['D0:9148', 'D1:112', 'D2:112'],
  points: [
    { period: '2001', value: 4874777 },
    { period: '2002', value: 4847496 },
    { period: '2003', value: 5056693 },
    { period: '2004', value: 5638517 },
    { period: '2005', value: 5805096 },
    { period: '2006', value: 6216028 },
    { period: '2007', value: 6971925 },
    { period: '2008', value: 7125307 },
    { period: '2009', value: 6141135 },
    { period: '2010', value: 6072757 },
    { period: '2011', value: 7031606 },
    { period: '2012', value: 7686489 },
    { period: '2013', value: 7943153 },
    { period: '2014', value: 8465909 },
    { period: '2015', value: 9921874 },
    { period: '2016', value: 11002522 },
    { period: '2017', value: 12143346 },
    { period: '2018', value: 12905131 },
    { period: '2019', value: 13374943 },
    { period: '2020', value: 6398642 },
    { period: '2021', value: 10205322 },
    { period: '2022', value: 12588333 },
    { period: '2023', value: 13910956 },
    { period: '2024', value: 14569794 },
    { period: '2025', value: 14258382 },
  ],
}

const SOM101F_RO: HubStaticSeries = {
  code: 'SOM101F',
  unitCode: '10225',
  pins: ['D0:105', 'D1:112', 'D2:112'],
  points: [
    { period: '2010', value: 4.3 },
    { period: '2011', value: 3.2 },
    { period: '2012', value: 3.4 },
    { period: '2013', value: 3.5 },
    { period: '2014', value: 3.3 },
    { period: '2015', value: 3.1 },
    { period: '2016', value: 2.9 },
    { period: '2017', value: 2.5 },
    { period: '2018', value: 2.1 },
    { period: '2019', value: 1.8 },
    { period: '2020', value: 2.1 },
    { period: '2021', value: 1.7 },
    { period: '2022', value: 1.7 },
    { period: '2023', value: 1.7 },
    { period: '2024', value: 1.9 },
    { period: '2025', value: 2 },
  ],
}

export const HUB_STATIC_SERIES: readonly HubStaticSeries[] = [
  FOM104D_RO,
  LOC101B_RO,
  POP107D_RO,
  POP201D_RO,
  POP206D_RO,
  POP217A_RO,
  TUR104E_RO,
  SOM101F_RO,
]

export function hubStaticSeries(code: string): HubStaticSeries | undefined {
  return HUB_STATIC_SERIES.find((series) => series.code === code)
}
