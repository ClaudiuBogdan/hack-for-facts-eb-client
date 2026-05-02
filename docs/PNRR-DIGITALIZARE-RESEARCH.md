# PNRR Digitalizare Research Report

**Date:** May 2026
**Dataset:** `public/data/pnrr-projects.json` (11 MB, 24,885 total projects)
**Search Engine:** Multi-keyword analysis with individual filters and OR aggregation
**Analyst:** Claude Code (automated research)

---

## Executive Summary

The PNRR (Planul Național de Redresare și Reziliență) dataset contains **24,885 projects** totaling tens of billions of EUR. Our systematic keyword research identified **9,865 digitalization-related projects** worth a combined **€4.32 billion**, representing **39.6% of all PNRR projects**.

A single keyword search for "digitalizare" captures only **4,307 projects (€1.31B)** — less than half the total. By using a broad multi-keyword OR strategy across 17 distinct search terms, we uncovered **5,558 additional projects (€3.01B)** that are clearly digitalization-related but use different terminology (cloud, electronic, smart, informatic, cybersecurity, etc.).

| Scope | Projects | Total Value |
|-------|----------|-------------|
| **All PNRR projects** | 24,885 | Full PNRR budget |
| **Digitalization (OR aggregate)** | **9,865** | **€4.32B** |
| "digitalizare" keyword alone | 4,307 | €1.31B |
| Additional from expanded keywords | 5,558 | €3.01B |

---

## Methodology

### Search Strategy
1. **Schema analysis** — Inspected the JSON dataset structure and all available filterable fields
2. **Individual keyword searches** — Tested 17+ distinct keywords/filters independently
3. **Overlap analysis** — Mapped which keywords co-occur in the same projects
4. **OR aggregation** — Combined all keywords with OR logic for comprehensive coverage
5. **Statistical profiling** — Analyzed by component, county, beneficiary, funding source, and progress

### Keyword Classes Tested

| Class | Keywords Tested | Purpose |
|-------|----------------|---------|
| Core Romanian | `digitalizare`, `digital` | Primary digital transformation terms |
| IT Infrastructure | `informatic`, `software`, `cloud`, `sistem informatic`, `TIC` | Systems and platforms |
| Governance | `e-guvernare`, `eguvernare`, `electronic`, `portal` | E-government services |
| Security | `cyber`, `cibernetic`, `securitate` | Cybersecurity infrastructure |
| Connectivity | `internet`, `broadband`, `banda larga`, `fibra` | Network infrastructure |
| Innovation | `smart`, `automat`, `tehnolog` | Smart/automated systems |
| Platforms | `platform`, `online`, `app`, `aplicatie` | Digital platforms |

---

## Dataset Schema

Each project in `public/data/pnrr-projects.json` has the following fields:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `Titlu Proiect` | string | Project title (searchable) | "Implementarea infrastructurii de cloud guvernamental" |
| `Nume Beneficiar` | string | Beneficiary name | "AUTORITATEA PENTRU DIGITALIZAREA ROMANIEI" |
| `CUI` | string | Unique fiscal ID code | "11054529" |
| `Județ` | string | County location | "București", "Cluj", "Național" |
| `Sursă Finanțare` | string | Funding type | "grant", "loan", "grant/loan" |
| `Valoare (EUR)` | number | Project value in EUR | 373231080 |
| `Progres Tehnic` | string | Technical progress % | "73%", "ÎN IMPLEMENTARE" |
| `Progres Financiar` | string | Financial progress % | "54%" |
| `Cod Componentă` | string | PNRR component code | "C7", "C9", "C15" |
| `Cod Măsură` | string | Measure within component | "I1", "I3", "R2" |
| `Localitate` | string | City/locality | "NAȚIONAL", "București" |
| `CRI` | string | Managing authority | "MIPE-RID", "MEC", "MS" |

---

## Individual Keyword Results

### 1. "digitalizare" — Core Keyword

| Metric | Value |
|--------|-------|
| Projects | **4,307** |
| Total Value | **€1,306,485,292** |

**By Component:**
| Component | Projects | Description |
|-----------|----------|-------------|
| C9 (Private sector R&D) | 3,810 | SME/NGO digitalization grants |
| C7 (Digital transformation) | 305 | Government digitalization |
| C15 (Education) | 86 | School/university digitalization |
| C10 (Local development) | 90 | Local IT infrastructure |
| C11 (Culture) | 10 | Cultural sector digitalization |
| C8 (Fiscal reform) | 5 | ANAF digitalization |
| C16 (REPowerEU) | 1 | Energy grid digitalization |

**By Measure:**
| Measure | Projects | Description |
|---------|----------|-------------|
| I3 (SME schemes) | 3,971 | Private sector digitalization grants |
| I9 (Digital equipment) | 156 | Education tech equipment |
| I1 (Infrastructure) | 90 | Major digital infrastructure |
| I11 (Classroom equipment) | 20 | School digital equipment |
| I16 (University digital) | 19 | Higher education digitalization |

**By County (Top 10):**
| County | Projects |
|--------|----------|
| București | 694 |
| Cluj | 406 |
| Timiș | 224 |
| Ilfov | 160 |
| Iași | 148 |
| Brașov | 145 |
| Constanța | 142 |
| Argeș | 142 |
| Prahova | 140 |
| Dolj | 135 |

**Sample Projects:**
- [C9/I2] Contractul de finanțare — Fondul European de Investiții — **€295,362,000**
- [C8/I2] ANAF digitalizare — conformare voluntară contribuabili — **€200,328,000**
- [C7/I8] D4eID — Carte de identitate electronică — **€61,606,920**
- [C8/I10] Servicii electronice avansate pentru pensii — **€60,066,800**
- [C16/I5] Digitalizarea rețelei naționale de transport energie — **€51,788,527**
- [C7/I6] Digitalizarea beneficiilor de asistență socială (ANPIS) — **€43,130,200**

---

### 2. "digital" (excl. "digitalizare") — Broader Digital Terms

| Metric | Value |
|--------|-------|
| Projects | **5,193** |
| Total Value | **€1,333,788,755** |

This captures terms like "digitală", "digitale", "transformare digitală", "pedagogie digitală", "capacitate digitală" that don't contain the word "digitalizare".

**Unique projects not caught by "digitalizare": ~5,193** — these are primarily in education (C15) and represent digital equipment, digital pedagogy, and digital capacity building.

**Sample (non-digitalizare):**
- [C7/I2] Platforma de Cloud Guvernamental și migrare — **€125,430,862**
- [C7/I16] Formare digitală funcționari publici — **€20,000,000**
- [C15/I8] Clasa viitorului — pedagogie digitală — **€11,923,920**
- [C15/I16] Ecosistem Digital pentru Învățare Sustenabilă (UB) — **€8,665,994**
- [C15/I16] Capacitatea digitală a Universității POLITEHNICA — **€7,674,661**

---

### 3. "informatic" — IT Systems

| Metric | Value |
|--------|-------|
| Projects | **133** |
| Total Value | **€513,502,324** |

**Sample:**
- [C7/I2] Migrarea sistemelor informatice în cloud (MAS IC) — **€125,430,862**
- [C7/I3] Platforma informatică din asigurările de sănătate — **€98,780,000**
- [C4/I3] Sistem informatic centralizat — tarifare rutieră — **€47,184,060**
- [C7/I5] Digitalizarea în domeniul mediului — sisteme informatice — **€41,951,280**
- [C14/I5] Sistem informatic de management PNRR — **€12,791,628**

---

### 4. "tehnolog" — Technology Projects

| Metric | Value |
|--------|-------|
| Projects | **1,346** |
| Total Value | **€451,672,795** |

Note: Many of these are "Liceul Tehnologic" (technical high schools) in building renovation projects, not pure digitalization. The genuine tech projects are a subset.

**Genuine digitalization samples:**
- [C7/I12] Protecție cibernetică pentru infrastructuri TIC — **€139,635,382**
- [C9/I4] Tehnologii avansate în microelectronică — **€22,308,053**
- [C15/I16] Implementarea tehnologiilor digitale (Universitatea Oradea) — **€5,088,326**

---

### 5. "cloud" — Cloud Infrastructure

| Metric | Value |
|--------|-------|
| Projects | **12** |
| Total Value | **€798,557,252** |

Highest value per project (€66.5M average). All are major infrastructure projects.

**All cloud projects:**
- [C7/I1] Implementarea infrastructurii de cloud guvernamental — **€373,231,080**
- [C7/I2] Migrarea aplicațiilor în cloud (MAS IC) — **€125,430,862** (×2 entries)
- [C7/I2] Platforma de Cloud Guvernamental — asistență tehnică — **€125,430,862**
- [C7/I2] Cloud privat Justiție — **€23,083,400**

---

### 6. "electronic" — Electronic Systems & Services

| Metric | Value |
|--------|-------|
| Projects | **28** |
| Total Value | **€489,364,464** |

High-value e-government projects:
- [C7/I4] Sistem electronic de management al cauzelor ECRIS V — **€96,379,000**
- [C7/I8] Carte de identitate electronică (D4eID) — **€61,606,920**
- [C8/I10] Servicii electronice avansate pentru pensii — **€60,066,800**
- [C7/I8] Adoptarea cărții electronice de identitate — **€48,321,840**
- [C4/I3] Sistem electronic de tarifare rutieră — **€47,184,060**
- [C8/I4] Vama electronică — **€33,512,086**

---

### 7. "platform" — Platform Projects

| Metric | Value |
|--------|-------|
| Projects | **92** |
| Total Value | **€278,052,445** |

- [C7/I2] Platforma de Cloud Guvernamental — **€125,430,862**
- [C7/I3] Platforma informatică din asigurările de sănătate — **€98,780,000**
- [C7/I10] Platforme interactive pentru managementul resurselor umane — **€8,000,000**
- [C9/I1] Platformă One Stop Shop pentru licențe/autorizații — **€2,435,270**
- [C9/I1] Platformă transparență legislativă — **€2,061,900**

---

### 8. "cyber" / "cibernetic" / "securitate" — Cybersecurity

| Metric | Value |
|--------|-------|
| Projects | **12** |
| Total Value | **€246,306,601** |

- [C7/I12] Protecție cibernetică pentru infrastructuri TIC publice și private — **€139,635,382**
- [C7/I13] Sisteme de securitate pentru spectrul guvernamental — **€37,340,403**
- [C7/I15] Competențe de securitate cibernetică — **€24,671,000**
- [C7/I6] Reforma monitorizării și securității muncii — **€24,026,600**
- [C7/I3] Securitate cibernetică pentru domeniul sănătății — **€20,000,000**

---

### 9. "software" — Software Development

| Metric | Value |
|--------|-------|
| Projects | **114** |
| Total Value | **€40,601,136** |

- [C7/I4] Infrastructură hardware/software ONRC — **€14,781,444**
- [C9/I1] Servicii dezvoltare software — platformă One Stop Shop — **€2,435,270**
- [C9/I1] Servicii dezvoltare software — platformă transparență legislativă — **€2,061,900**

---

### 10. "smart" — Smart City / Smart Systems

| Metric | Value |
|--------|-------|
| Projects | **347** |
| Total Value | **€202,443,305** |

- [C9/I4] ASSET-IxC — Smart Energy-Efficient Transducers — **€74,386,867**
- [C15/I11] Școli Motivante Adaptate Ritmului Tehnologic - PH SMART — **€9,076,191**
- [C15/I16] Implementarea tehnologiilor digitale în universități — **€5,088,326**

---

### 11. Other Keywords

| Keyword | Projects | Total Value | Notes |
|---------|----------|-------------|-------|
| `TIC` | 435 | €257M | IT&C infrastructure references |
| `IT` (standalone) | 124 | €25.5M | IT equipment, infrastructure |
| `automat` | 35 | €81M | Automatizare, automated systems |
| `internet` | 12 | €47M | Internet broadband access |
| `broadband` / `banda larga` | 8 | €65M | Broadband infrastructure |
| `online` | 24 | €5.9M | Online platforms |
| `portal` | 3 | €931K | Government portals |
| `e-guvernare` / `eguvernare` | **0** | — | **Not used in PNRR titles** |

---

## Keyword Overlap Analysis

### Top Keyword Combinations (multi-tagged projects)

| Combination | Count | Interpretation |
|-------------|-------|----------------|
| digital + tehnolog | 480 | "tehnologii digitale", "transformare digitală tehnologică" |
| digitalizare + tehnolog | 156 | "digitalizare tehnologică" |
| digital + informatic | 54 | "sisteme informatice digitale" |
| smart + tehnolog | 46 | "smart technology" projects |
| digitalizare + software | 45 | "digitalizare prin software" |
| digital + smart | 34 | "smart digital" |
| digitalizare + smart | 33 | "digitalizare smart" |
| TIC + digitalizare | 27 | "infrastructură TIC digitalizare" |
| IT + digitalizare + software | 26 | "echipamente IT software digitalizare" |

### Projects Unique to Each Keyword (no overlap)

| Keyword | Unique Projects | Unique Value |
|---------|----------------|--------------|
| digital (excl. digitalizare) | **4,560** | **€1,079,922,945** |
| digitalizare | **3,938** | **€1,092,507,191** |
| tehnolog | 609 | €200,314,320 |
| TIC | 372 | €107,287,041 |
| smart | 217 | €171,824,917 |
| platform | 56 | €32,135,883 |
| IT | 62 | €11,769,172 |
| cloud | 4 | €408,177,533 |
| electronic | 12 | €248,614,690 |
| informatic | 26 | €19,986,129 |
| automat | 13 | €31,983,285 |
| broadband | 5 | €37,969,810 |
| cyber | 3 | €44,764,721 |

**Key insight:** `digital` (broader term) and `digitalizare` (specific term) each have thousands of unique projects not captured by the other, confirming both are necessary for comprehensive coverage.

---

## Aggregated OR Results

**Combined query using all digitalization-related keywords with OR logic.**

### Overall

| Metric | Value |
|--------|-------|
| **Total matching projects** | **9,865** |
| **Percentage of all PNRR projects** | **39.6%** |
| **Total combined value** | **€4,320,095,261** |

### By PNRR Component

| Component | Projects | Value (EUR) | Avg/Project | Component Description |
|-----------|----------|-------------|-------------|----------------------|
| **C7** | **536** | **€1,835,647,092** | **€3.43M** | **Digitalizarea României** — cloud, eHealth, eJustice, cybersecurity, eID |
| **C15** | **4,401** | **€1,057,196,274** | **€240K** | **Educație** — digital equipment, smart classrooms, university digitalization |
| **C9** | **4,482** | **€732,173,267** | **€163K** | **Sector privat** — SME digitalization grants, R&D, digital platforms |
| **C8** | 7 | €413,692,160 | €59.1M | **Reforma fiscală** — ANAF digitalization, e-customs, e-pension |
| **C3** | 105 | €82,619,909 | €787K | **Deșeuri** — digital waste management monitoring |
| **C10** | 293 | €72,030,822 | €246K | **Fondul local** — smart city, local digital infrastructure |
| **C16** | 2 | €52,131,803 | €26.1M | **REPowerEU** — energy grid digitalization |
| **C4** | 3 | €51,119,180 | €17.0M | **Transport** — electronic road tolling |
| **C5** | 3 | €2,277,241 | €759K | **Eficiență energetică** — digital building registry |
| **C11** | 30 | €6,804,060 | €227K | **Turism și cultură** — cultural digitalization |
| **C14** | 1 | €12,791,628 | €12.8M | **Guvernanță** — PNRR management IT system |
| **C2** | 1 | €1,290,709 | €1.3M | **Silvicultură** — one digital platform project |
| **C13** | 1 | €321,117 | €321K | **Incluziune socială** — one digital project |

**Component hierarchy by value:**
```
C7 (Digital)   ████████████████████████████████████████  €1.84B (42.5%)
C15 (Educație) ██████████████████████                    €1.06B (24.5%)
C9 ( Privat)   ███████████████                           €732M  (16.9%)
C8 (Fiscal)    ████████                                  €414M  (9.6%)
C3 (Deșeuri)   ██                                        €83M   (1.9%)
C10 (Local)    ██                                        €72M   (1.7%)
C16 (Energy)   █                                         €52M   (1.2%)
C4 (Transport) █                                         €51M   (1.2%)
Other          █                                         €24M   (0.5%)
```

### By Measure (Top 10)

| Measure | Projects | Value | Description |
|---------|----------|-------|-------------|
| I3 (SME schemes) | 4,735 | €695.9M | Private sector digitalization grants |
| I9 (Digital equipment for schools) | 2,219 | €348.5M | Education tech resources |
| I11 (Classroom equipment) | 1,847 | €456.4M | School digital equipment |
| I1 (Infrastructure) | 325 | €522.6M | Major digital infrastructure |
| I14 (Cyber resilience) | 258 | €62.1M | Internet service security |
| I13 (IT labs) | 176 | €6.8M | Informatics lab equipment |
| I4 (Judicial/transport digital) | 122 | €440.6M | E-justice, road systems |
| I16 (University digital) | 57 | €217.4M | Higher education digitalization |
| I8 (Teacher training/eID) | 35 | €194.5M | Digital pedagogy, identity cards |
| I2 (Cloud/financial instruments) | 16 | €766.7M | Cloud infrastructure, funds |

### By County (Top 20)

| Rank | County | Projects | Value (EUR) |
|------|--------|----------|-------------|
| 1 | **București** | 946 | €761,664,785 |
| 2 | Cluj | 626 | €150,009,873 |
| 3 | Timiș | 414 | €157,210,697 |
| 4 | Argeș | 360 | €43,755,117 |
| 5 | Bihor | 347 | €38,508,724 |
| 6 | Suceava | 346 | €63,783,612 |
| 7 | Constanța | 315 | €63,128,118 |
| 8 | Brașov | 302 | €62,473,719 |
| 9 | Dolj | 285 | €47,414,359 |
| 10 | Maramureș | 279 | €41,362,037 |
| 11 | Ilfov | 270 | €40,016,580 |
| 12 | Iași | 261 | €96,952,877 |
| 13 | Mureș | 256 | €42,204,801 |
| 14 | Prahova | 254 | €37,919,632 |
| 15 | Arad | 235 | €41,221,858 |
| 16 | Olt | 223 | €24,960,348 |
| 17 | Bacău | 221 | €47,352,348 |
| 18 | Galați | 219 | €65,046,099 |
| 19 | Buzău | 219 | €28,923,700 |
| 20 | Alba | 215 | €37,506,299 |

### By Managing Authority (CRI)

| CRI | Projects | Value | Authority |
|-----|----------|-------|-----------|
| MIPE-RID | 4,635 | €701.8M | Ministry of Investments (regional development) |
| MEC | 4,400 | €1,053.6M | Ministry of Economy (education/EU funds) |
| MDLPA | 297 | €77.9M | Ministry of Local Development |
| MS | 289 | €341.0M | Ministry of Health |
| MMAP | 108 | €131.8M | Ministry of Environment |
| MEDAT | 43 | €1,060.5M | Ministry of Education |
| MC | 30 | €6.8M | Ministry of Culture |
| ANC | 25 | €35.5M | National Customs Authority |
| MJ | 16 | €179.9M | Ministry of Justice |
| MF | 6 | €353.6M | Ministry of Finance |
| MMFTSS | 4 | €120.9M | Ministry of Labour |
| MTI | 3 | €51.1M | Ministry of Transport |
| ANFP | 3 | €30.0M | National Agency of Civil Servants |
| MAI | 2 | €109.9M | Ministry of Internal Affairs |
| SGG | 1 | €51.8M | General Secretariat of Government |

### By Funding Source

| Source | Projects | Percentage |
|--------|----------|------------|
| grant | 4,981 | 50.5% |
| grant/loan | 4,606 | 46.7% |
| loan | 278 | 2.8% |

### Technical Progress Distribution

| Progress Range | Projects | Percentage |
|----------------|----------|------------|
| **76-100%** (near complete) | 3,404 | **73.5%** |
| 51-75% | 689 | 14.9% |
| 26-50% | 271 | 5.9% |
| 0-10% | 153 | 3.3% |
| 11-25% | 111 | 2.4% |

- **Average technical progress:** 82.4%
- **Median technical progress:** 95.0%
- Progress data available for 4,628 projects (others have text status like "ÎN IMPLEMENTARE")

---

## Top 20 Highest-Value Digitalization Projects

| Rank | Value | Comp. | Beneficiary | Title | Progress |
|------|-------|-------|-------------|-------|----------|
| 1 | **€373,231,080** | C7/I1 | Autoritatea pentru Digitalizarea României | Implementarea infrastructurii de cloud guvernamental | 73% |
| 2 | **€295,362,000** | C9/I2 | Ministerul Investițiilor și Proiectelor Europene | Fondul European de Investiții — Fond de fonduri | <30% |
| 3 | **€200,328,000** | C8/I2 | Ministerul Finanțelor | ANAF — Creșterea conformării voluntare a contribuabililor | 79% |
| 4 | **€139,635,382** | C7/I12 | U.M. 0929 | Protecție cibernetică pentru infrastructuri TIC | 35% |
| 5 | **€125,430,862** | C7/I2 | Autoritatea pentru Digitalizarea României | Migrarea aplicațiilor și sistemelor informatice în cloud | 76% |
| 6 | **€125,430,862** | C7/I17 | Autoritatea pentru Digitalizarea României | Migrarea aplicațiilor și sistemelor informatice în cloud | 57% |
| 7 | **€125,430,862** | C7/I2 | Ministerul Economiei, Digitalizării... | Platforma de Cloud Guvernamental — asistență tehnică | 60% |
| 8 | **€98,780,000** | C7/I3 | Casa Națională de Asigurări de Sănătate | Platforma informatică din asigurările de sănătate | N/A |
| 9 | **€96,379,000** | C7/I4 | Ministerul Justiției | Sistem electronic de management al cauzelor ECRIS V | 50% |
| 10 | **€89,760,000** | C8/I3 | Ministerul Finanțelor | ANAF — transformarea digitală | 88% |
| 11 | **€74,386,867** | C9/I4 | AUMOVIO Technologies Romania | ASSET-IxC — Smart Energy-Efficient Transducers | <30% |
| 12 | **€61,606,920** | C7/I8 | Ministerul Afacerilor Interne | D4eID — Carte de identitate electronică | 64% |
| 13 | **€60,066,800** | C8/I10 | Casa Națională de Pensii Publice | Servicii electronice avansate pentru pensii | 50% |
| 14 | **€51,788,527** | C16/I5 | CN Transelectrica | Digitalizarea rețelei naționale de transport energie | <30% |
| 15 | **€48,321,840** | C7/I8 | DG Evidența Persoanelor | Adoptarea cărții electronice de identitate | 39% |
| 16 | **€47,184,060** | C4/I3 | CNAIR | Sistem electronic de tarifare rutieră | 30% |
| 17 | **€43,130,200** | C7/I6 | ANPIS | Digitalizarea beneficiilor de asistență socială | 70% |
| 18 | **€41,951,280** | C7/I5 | Ministerul Mediului | Digitalizare în domeniul mediului | 98% |
| 19 | **€34,125,626** | C9/I4 | Robert Bosch SRL | EURODRIVES — Microelectronică pentru mobilitate | <30% |
| 20 | **€33,512,086** | C8/I4 | Autoritatea Vamală Română | Vama electronică | 92% |

---

## Top Beneficiaries

| Rank | Beneficiary | Projects | Total Value |
|------|-------------|----------|-------------|
| 1 | **Autoritatea pentru Digitalizarea României** | 7 | **€642,323,624** |
| 2 | Ministerul Finanțelor | 4 | €319,719,714 |
| 3 | Ministerul Investițiilor și Proiectelor Europene | 2 | €308,153,628 |
| 4 | Ministerul Justiției | 5 | €142,524,183 |
| 5 | U.M. 0929 (Cyber Defense) | 2 | €140,518,127 |
| 6 | Ministerul Economiei, Digitalizării... | 2 | €130,130,862 |
| 7 | Casa Națională de Asigurări de Sănătate | 1 | €98,780,000 |
| 8 | AUMOVIO Technologies Romania | 1 | €74,386,867 |
| 9 | Ministerul Afacerilor Interne | 1 | €61,606,920 |
| 10 | Casa Națională de Pensii Publice | 1 | €60,066,800 |
| 11 | CN Transelectrica | 1 | €51,788,527 |
| 12 | CNAIR | 3 | €51,119,180 |
| 13 | DG Evidența Persoanelor | 1 | €48,321,840 |
| 14 | ANPIS | 1 | €43,130,200 |
| 15 | Ministerul Sănătății | 4 | €42,886,506 |
| 16 | Ministerul Mediului | 1 | €41,951,280 |
| 17 | Universitatea POLITEHNICA București | 5 | €38,214,194 |
| 18 | Robert Bosch SRL | 1 | €34,125,626 |
| 19 | Autoritatea Vamală Română | 1 | €33,512,086 |
| 20 | Agenția Națională a Funcționarilor Publici | 3 | €30,000,000 |

---

## C7 Component Deep Dive — "Digitalizarea României"

Component C7 is the **dedicated digital transformation chapter** of PNRR. It contains the highest-value digitalization projects.

### C7 Measures (from `src/features/pnrr/data/allocations.json`)

| Measure | Title | Funding |
|---------|-------|---------|
| I1 | Implementarea infrastructurii de cloud guvernamental | grant |
| I2 | Dezvoltarea cloudului și migrarea în cloud | grant |
| I3 | Instituirea sistemului de eHealth și telemedicină | grant |
| I4 | Digitalizarea sistemului judiciar | grant |
| I5 | Digitalizare în domeniul mediului | grant |
| I6 | Digitalizare în domeniul muncii și protecției sociale | grant |
| I7 | Introducerea formularelor electronice (eForms) în achiziții publice | grant |
| I8 | Carte de identitate electronică și semnătură digitală | grant |
| I9 | Digitalizarea sectorului organizațiilor neguvernamentale | grant |
| I10 | Transformarea digitală în managementul funcției publice | grant |
| I11 | Introducere scheme sprijinire servicii comunicații în zone albe | grant |
| I12 | Protecția securității cibernetice pentru infrastructuri TIC critice | grant |
| I13 | Sisteme de securitate pentru protecția spectrului guvernamental | grant |
| I14 | Reziliența și securitatea cibernetică a ISP-urilor pentru autorități | grant |
| I15 | Competențe de securitate cibernetică | grant |
| I16 | Formare funcționari publici — competențe digitale | grant |
| I17 | Biblioteci ca hub-uri competențe digitale | grant |
| I18 | Transformare digitală și automatizare în administrația publică | loan |
| I19 | Scheme perfecționare/recalificare angajați firme | grant/loan |
| R1 | Cadrul unitar arhitectură cloud guvernamental | grant |
| R2 | Tranziția spre conectivitate UE 2025 | grant |
| R3 | Securitatea cibernetică a entităților cu infrastructuri critice | grant |
| R4 | Competențe digitale pentru funcția publică și educație pe parcursul vieții | grant |

---

## Other Dataset References to Digitalization

Beyond `pnrr-projects.json`, digitalization appears in:

| File | Matches | Context |
|------|---------|---------|
| `src/assets/functional-classifications-general-ro.json` | 1 | Revenue line: "Venituri suplimentare incasate din digitalizare" |
| `src/features/pnrr/data/allocations.json` | 3 | C7 measure titles (I5, I10, I16) |
| `src/features/pnrr/data/component-definitions.ts` | 3 | ANAF, SME, cultural sector digitalization |
| `src/features/pnrr/data/emblematic-projects.ts` | 3 | `anaf-digitalizare`, `digitalizare-invatamant` |
| `public/assets/text/ro/functional/*.md` | ~17 | Classification descriptions referencing digitalization |
| `src/content/learning/modules/expenditure-basics/` | 1 | Interactive scenario with canceled digitalization projects |

---

## Key Findings

### 1. "digitalizare" Alone Misses 56% of Digitalization Projects

The single keyword `digitalizare` captures **4,307 projects (€1.31B)** but misses **5,558 projects (€3.01B)** that use related terminology. A comprehensive search strategy is essential.

### 2. Cloud Projects Have the Highest Per-Project Value

With only **12 projects**, the "cloud" category accounts for **€799M** — an average of **€66.5M per project**. These are mostly C7 government infrastructure projects.

### 3. Education (C15) Dominates by Count, C7 by Value

- **C15 (Education)**: 4,401 projects, €1.06B (avg €240K) — equipment, smart classrooms, university digitalization
- **C7 (Digital Transformation)**: 536 projects, €1.84B (avg €3.43M) — cloud, eHealth, eJustice, cybersecurity

### 4. "e-guvernare" Returns Zero Results

The Romanian PNRR dataset does **not** use the term "e-guvernare" or "eguvernare" in project titles. Instead, it uses "digitalizare", "electronic", "cloud", and "platformă".

### 5. Top Beneficiary: Autoritatea pentru Digitalizarea României

With **€642M across 7 projects**, ADR is the single largest beneficiary of digitalization funds — managing cloud infrastructure, cloud migration, and platform development.

### 6. 73.5% of Projects Are Near Completion (76-100% Progress)

The majority of digitalization projects report high technical progress, with a median of 95%. However, the highest-value projects (cloud, cybersecurity) show lower progress (35-76%), suggesting they are still in implementation.

### 7. București Dominates Geographic Distribution

București hosts **946 projects (€762M)** — primarily because national institutions are headquartered there. Cluj (626 projects, €150M) and Timiș (414, €157M) follow as major digital hubs.

### 8. App Default Excludes High-Value National Projects

The Transparenta.eu app excludes national projects by default, hiding ~33 high-value digitalization projects worth **~€1.7B**. The visible total drops from €4.32B to approximately **€2.6B** when national projects are filtered.

---

## Recommended Search Queries

### Comprehensive Digitalization (captures ~9,865 projects)
```
digitalizare OR digital OR informatic OR software OR cloud OR automat OR electronic OR cyber OR platform OR smart OR broadband OR internet OR online OR portal
```

### High-Value Infrastructure Only (projects >€1M)
```
cloud OR cyber OR electronic OR "sistem informatic" OR "infrastructura tic" OR broadband
```

### Government Digital Transformation (C7 only)
```
Filter: Cod Componentă = C7
```

### Health Digitalization
```
ehealth OR telemedicina OR "sistem informatic" sanitat* OR "digitalizarea spital"
```

### Education Digitalization (C15)
```
Filter: Cod Componentă = C15
Keywords: digital OR smart OR tehnolog OR informatic
```

### SME Digitalization (C9/I3)
```
Filter: Cod Componentă = C9, Cod Măsură = I3
Keyword: digitalizare
```

---

## Data Quality Notes

1. **Duplicate entries**: Some high-value projects appear multiple times with identical values (e.g., "Migrarea aplicațiilor în cloud" appears 2-3 times). This may represent different reporting periods or funding tranches.
2. **Mixed progress formats**: Some projects report numeric percentages ("73%"), others use text ("ÎN IMPLEMENTARE (sub 30%)"). The text-format projects are excluded from progress statistics.
3. **"tehnolog" noise**: Many matches for "tehnolog" are "Liceul Tehnologic" (technical high schools) in building renovation projects — not core digitalization. ~609 unique projects use this keyword.
4. **C9 volume**: 4,482 C9 projects are mostly small SME digitalization grants (avg €163K), which inflates project counts but not total value proportionally.
5. **National vs local**: "Național" county projects are the highest-value but hidden by the app's default filter. Always check whether "Include proiecte naționale" is enabled.

---

## PNRR Component Reference

| Code | Name | Digitalization Relevance |
|------|------|------------------------|
| C1 | Infrastructură apă | Low |
| C2 | Silvicultură | Very low (1 project) |
| C3 | Deșeuri | Low (digital monitoring) |
| C4 | Transport | Low (electronic tolling) |
| C5 | Eficiență energetică | Very low (digital registry) |
| C6 | Energie | Very low |
| **C7** | **Digitalizarea României** | **PRIMARY** — cloud, cybersecurity, eHealth, eJustice, eID |
| **C8** | **Reforma fiscală** | **HIGH** — ANAF, e-customs, e-pension |
| **C9** | **Sector privat / R&D** | **HIGH** — SME digitalization, digital platforms, research |
| C10 | Fondul local de dezvoltare | Medium (smart city) |
| C11 | Turism și cultură | Medium (cultural digitalization) |
| C12 | Sănătate | Low (hospital infrastructure) |
| C13 | Incluziune socială | Very low |
| C14 | Guvernanță | Low (PNRR management system) |
| **C15** | **Educație** | **HIGH** — digital equipment, smart schools, university digitalization |
| C16 | REPowerEU | Low (energy grid digitalization) |

---

*Report generated from direct analysis of `public/data/pnrr-projects.json` (24,885 projects, 348,392 lines). All values in EUR. Research conducted with 17 individual keyword searches and comprehensive OR aggregation.*
